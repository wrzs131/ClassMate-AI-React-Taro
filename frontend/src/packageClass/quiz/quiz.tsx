import { useState } from "react";
import { View, Text } from "@tarojs/components";
import { useDidShow, useRouter } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { Input } from "@nutui/nutui-react-taro";
import { Tag, LoadMore } from "../../components/ui";
import { api, requireLogin } from "../../utils/api";

export default function Quiz() {
  const router = useRouter();
  const quizId = (router.params?.quiz_id as string) || "";
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [already, setAlready] = useState<any>(null);
  const [retry, setRetry] = useState(false);

  useDidShow(() => {
    if (!requireLogin()) return;
    if (!quizId) {
      setError("缺少测验编号");
      setLoading(false);
      return;
    }
    load();
  });

  const items = quiz?.items || [];
  const answeredCount = Object.values(answers).filter((v) => String(v || "").trim()).length;
  const progress = items.length ? Math.round((answeredCount / items.length) * 100) : 0;

  async function load() {
    setLoading(true);
    try {
      const data = await api.quiz(quizId);
      setQuiz(data);
      setError("");
      try {
        setAlready(await api.report(quizId));
      } catch {
        setAlready(null);
      }
    } catch (err: any) {
      setError(err?.message || "测验加载失败");
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(itemId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  }

  function pick(item: any, option: string) {
    const letter = (option || "").trim().charAt(0).toUpperCase();
    setAnswer(item.id, /[A-D]/.test(letter) ? letter : option);
  }

  function verify(): boolean {
    if (answeredCount < items.length) {
      const left = items.length - answeredCount;
      Taro.showModal({
        title: "还有题目没答",
        content: `还剩 ${left} 题。确定提交吗？空题按错误计分。`,
        success: (res) => {
          if (res.confirm) doSubmit();
        },
      });
      return false;
    }
    return true;
  }

  function submit() {
    if (!verify()) return;
    doSubmit();
  }

  async function doSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const payload = items.map((item: any) => ({ item_id: item.id, answer: answers[item.id] || "" }));
      // 后端现在「秒回」：立即落一条 grading 记录并返回，批改在后台任务里跑
      await api.submit(quizId, payload);
      Taro.showToast({ title: "已交卷，AI 正在批改", icon: "none", duration: 1500 });
      setTimeout(() => Taro.redirectTo({ url: `/packageClass/report/report?quiz_id=${quizId}` }), 800);
    } catch (err: any) {
      Taro.showModal({
        title: "提交失败",
        content: err?.message || "网络异常，请检查后端服务后重试。",
        showCancel: false,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function difficultyTag(d: string): "success" | "warning" | "error" {
    return d === "hard" ? "error" : d === "medium" ? "warning" : "success";
  }

  function difficultyLabel(d: string): string {
    return d === "hard" ? "较难" : d === "medium" ? "中等" : "容易";
  }

  function viewReport() {
    Taro.redirectTo({ url: `/packageClass/report/report?quiz_id=${quizId}` });
  }

  return (
    <View className='page'>
      <View className='hero'>
        <Text className='hero-title'>随堂测验</Text>
        <Text className='hero-sub'>
          共 {items.length || 5} 题，每题 10 分。交卷后立即批改，错题会给出步骤级反馈与推荐练习。
        </Text>
      </View>

      {error ? <View className='error'>{error}</View> : null}
      {loading ? <LoadMore text='正在加载题目…' /> : null}

      {already && !retry ? (
        <View className='card'>
          <View className='card-title'>
            <Text>{already.status === "grading" ? "你已交卷，AI 正在批改" : "你已提交过本次测验"}</Text>
            <Tag text={already.status === "grading" ? "批改中" : "已交卷"} type={already.status === "grading" ? "warning" : "success"} />
          </View>
          {already.status === "grading" ? (
            <Text className='muted' style={{ display: "block" }}>
              报告生成后即可查看分数、步骤反馈与错因分析，稍等几秒后点「查看报告」。
            </Text>
          ) : (
            <Text className='muted' style={{ display: "block" }}>
              得分 {already.score} / {already.max_score}，正确率 {already.percent}%。
            </Text>
          )}
          <View className='row' style={{ marginTop: "24rpx" }}>
            <View className='btn primary' style={{ flex: 1 }} onClick={viewReport}>
              <Text>查看报告</Text>
            </View>
            <View className='btn' style={{ flex: 1 }} onClick={() => setRetry(true)}>
              <Text>再练一遍</Text>
            </View>
          </View>
        </View>
      ) : null}

      {!loading && quiz && (!already || retry) ? (
        <>
          <View className='card progress-card'>
            <View className='row'>
              <Text className='muted'>
                进度 {answeredCount} / {items.length}
              </Text>
              <View className='bar'>
                <View className='bar-fill' style={{ width: `${progress}%` }} />
              </View>
              <Text className='muted'>{progress}%</Text>
            </View>
          </View>

          {items.map((item: any, idx: number) => (
            <View key={item.id} className='card'>
              <View className='row' style={{ marginBottom: "12rpx" }}>
                <Text className='q-no'>第 {idx + 1} 题</Text>
                <Tag text={difficultyLabel(item.difficulty)} type={difficultyTag(item.difficulty)} />
                <Tag text={item.kp} type='default' />
                <Tag
                  text={item.source_type === "reference_paper" ? "参考试卷" : "教材改编"}
                  type={item.source_type === "reference_paper" ? "primary" : "default"}
                />
              </View>
              <Text className='stem'>{item.stem}</Text>

              {item.qtype === "choice" ? (
                <View style={{ marginTop: "16rpx" }}>
                  {item.options.map((opt: string) => (
                    <View
                      key={opt}
                      className={`option ${answers[item.id] === opt.trim().charAt(0).toUpperCase() ? "active" : ""}`}
                      onClick={() => pick(item, opt)}
                    >
                      <Text>{opt}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ marginTop: "16rpx" }}>
                  <Input
                    value={answers[item.id] || ""}
                    placeholder='填写答案，含单位的可只写数值部分'
                    onChange={(v) => setAnswer(item.id, String(v ?? ""))}
                  />
                  <Text className='muted' style={{ display: "block", marginTop: "10rpx" }}>
                    填空/解答题请写最终结果，多解用“或”连接。
                  </Text>
                </View>
              )}
            </View>
          ))}

          <View className={`btn blue ${submitting ? "disabled" : ""}`} onClick={submit}>
            <Text>{submitting ? "批改中…" : "交卷并查看批改"}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
