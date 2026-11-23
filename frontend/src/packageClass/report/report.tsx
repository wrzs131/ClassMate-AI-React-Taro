import { useRef, useState } from "react";
import { View, Text } from "@tarojs/components";
import { useDidShow, useRouter } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { Tag, CollapseItem, LoadMore } from "../../components/ui";
import { api, getJoined, requireLogin } from "../../utils/api";

export default function Report() {
  const router = useRouter();
  const quizId = (router.params?.quiz_id as string) || "";
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const polling = useRef(false);

  useDidShow(() => {
    if (!requireLogin()) return;
    if (!quizId) {
      setError("缺少测验编号");
      setLoading(false);
      return;
    }
    load();
  });

  const items = report?.items || [];
  const mastery = report?.mastery || [];
  const percent = Number(report?.percent || 0);

  async function load(attempt = 0) {
    if (polling.current && attempt === 0) return;
    setLoading(true);
    try {
      const data: any = await api.report(quizId);
      // 交卷接口现在"秒回"，服务端在后台批改：报告里 status=grading 时继续轮询
      if (data?.status === "grading") {
        setReport(null);
        setPending(true);
        setError("");
        setLoading(false);
        if (attempt < 90) setTimeout(() => load(attempt + 1), 2000);
        else {
          setPending(false);
          setError("批改耗时较长，请稍后在「我的」里重新打开报告。");
        }
        return;
      }
      if (data?.status === "failed") {
        setReport(null);
        setPending(false);
        setLoading(false);
        setError(data?.error || "批改失败，请重新交卷。");
        return;
      }
      setReport(data);
      setError("");
      setPending(false);
      setLoading(false);
    } catch (err: any) {
      const message = err?.message || "报告加载失败";
      // 刚交卷、占位记录还没落库时也会 404：同样等待重试
      if ((message.includes("还没有提交记录") || message.includes("404")) && attempt < 30) {
        setPending(true);
        setLoading(false);
        setTimeout(() => load(attempt + 1), 2000);
        return;
      }
      setPending(false);
      setError(message);
      setLoading(false);
    }
  }

  function barClass(score: number): string {
    const value = Number(score || 0);
    if (value < 0.6) return "bad";
    if (value < 0.8) return "warn";
    return "";
  }

  function barType(score: number): "error" | "warning" | "success" {
    const value = Number(score || 0);
    if (value < 0.6) return "error";
    if (value < 0.8) return "warning";
    return "success";
  }

  function masteryLabel(score: number): string {
    const value = Number(score || 0);
    if (value < 0.6) return "需加强";
    if (value < 0.8) return "基本掌握";
    return "掌握良好";
  }

  function backClass() {
    if (getJoined()?.id) Taro.redirectTo({ url: "/packageClass/classroom/classroom" });
    else Taro.reLaunch({ url: "/pages/home/home" });
  }

  function openMe() {
    Taro.navigateTo({ url: "/packageClass/me/me" });
  }

  return (
    <View className='page'>
      <View className='hero'>
        <Text className='hero-title'>本次测验报告</Text>
        <Text className='hero-sub'>批改不只判对错：每题都给出错因与下一步建议。</Text>
        {report ? (
          <View className='row' style={{ marginTop: "22rpx" }}>
            <Text className='code-big' style={{ fontSize: "36rpx", letterSpacing: "2rpx" }}>
              {report.score} / {report.max_score}
            </Text>
            <Tag text={`正确率 ${percent}%`} type='success' />
          </View>
        ) : null}
      </View>

      {error && !pending ? <View className='error'>{error}</View> : null}
      {loading ? <LoadMore text='正在加载报告…' /> : null}
      {!loading && pending ? <LoadMore text='AI 正在批改，报告马上就好…' /> : null}

      {report ? (
        <>
          <View className='card'>
            <View className='card-title'>
              <Text>诊断结论</Text>
              <Tag text='多智能体诊断' type='warning' />
            </View>
            <Text className='summary'>{report.diagnosis?.summary || "暂无诊断结论"}</Text>
            {report.weak_points?.length ? (
              <View className='row' style={{ marginTop: "16rpx" }}>
                <Text className='muted'>薄弱知识点</Text>
                {report.weak_points.map((kp: string) => (
                  <Tag key={kp} text={kp} type='error' />
                ))}
              </View>
            ) : null}
          </View>

          <View className='card'>
            <View className='card-title'>
              <Text>知识点掌握度</Text>
              <Text className='muted'>答对难题加分更多</Text>
            </View>
            {!mastery.length ? <View className='empty'>还没有掌握度数据</View> : null}
            {mastery.map((row: any) => (
              <View key={row.kp} className='kp-row'>
                <View className='row'>
                  <Text className='kp-name'>{row.kp}</Text>
                  <Tag text={masteryLabel(row.score)} type={barType(row.score)} />
                  <Text className='muted'>{Math.round(Number(row.score) * 100)}%</Text>
                </View>
                <View className='bar' style={{ margin: "10rpx 0 0" }}>
                  <View
                    className={`bar-fill ${barClass(row.score)}`}
                    style={{ width: `${Math.round(Number(row.score) * 100)}%` }}
                  />
                </View>
              </View>
            ))}
          </View>

          <View className='card'>
            <View className='card-title'>
              <Text>逐题反馈</Text>
              <Text className='muted'>点击题目标题展开解析</Text>
            </View>
            {items.map((item: any, idx: number) => (
              <View key={item.quiz_item_id} className='item'>
                <View className='row'>
                  <Text className='q-no'>第 {idx + 1} 题</Text>
                  <Tag text={item.correct ? "正确" : "错误"} type={item.correct ? "success" : "error"} />
                  <Text className='muted'>
                    {item.points} / {item.points_max} 分
                  </Text>
                </View>
                <Text className='stem'>{item.stem}</Text>
                <Text className='muted' style={{ display: "block", marginTop: "10rpx" }}>
                  你的答案：{item.student_answer || "（未作答）"}
                  {!item.correct ? ` · 正确答案：${item.answer}` : ""}
                </Text>
                {!item.correct && item.error_type ? (
                  <View style={{ marginTop: "10rpx" }}>
                    <Tag text={`错因：${item.error_type}`} type='warning' />
                  </View>
                ) : null}

                <View style={{ marginTop: "12rpx" }}>
                  <CollapseItem title='步骤反馈与解析'>
                    <View className='detail'>
                      {(item.step_feedback || []).map((fb: string, i: number) => (
                        <Text key={i} className='script-text'>
                          · {fb}
                        </Text>
                      ))}
                      {item.analysis ? (
                        <Text className='script-text' style={{ marginTop: "10rpx" }}>
                          解析：{item.analysis}
                        </Text>
                      ) : null}
                      <Text className='muted' style={{ display: "block", marginTop: "10rpx" }}>
                        来源：{item.source}
                      </Text>
                    </View>
                  </CollapseItem>
                </View>
              </View>
            ))}
          </View>

          {report.error_counts && Object.keys(report.error_counts).length ? (
            <View className='card'>
              <View className='card-title'>
                <Text>错因分布</Text>
                <Text className='muted'>累计统计</Text>
              </View>
              <View className='row'>
                {Object.keys(report.error_counts).map((key) => (
                  <Tag key={key} text={`${key} × ${report.error_counts[key]}`} type='error' />
                ))}
              </View>
            </View>
          ) : null}

          {report.recommended?.length ? (
            <View className='card'>
              <View className='card-title'>
                <Text>下一步练什么</Text>
                <Tag text={`${report.recommended.length} 题`} type='success' />
              </View>
              <Text className='muted' style={{ display: "block", marginBottom: "12rpx" }}>
                同知识点优先，其次考虑错题同类题：
              </Text>
              {report.recommended.map((rec: any, i: number) => (
                <View key={rec.id} className='rec'>
                  <Text className='script-text'>
                    {i + 1}. {rec.stem}
                  </Text>
                  <View className='row' style={{ marginTop: "8rpx" }}>
                    <Tag text={rec.difficulty} type='default' />
                    <Tag
                      text={rec.source_type === "reference_paper" ? "参考试卷" : "教材改编"}
                      type={rec.source_type === "reference_paper" ? "primary" : "default"}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View className='row'>
            <View className='btn primary' style={{ flex: 1 }} onClick={backClass}>
              <Text>回到课堂</Text>
            </View>
            <View className='btn' style={{ flex: 1 }} onClick={openMe}>
              <Text>我的学情</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
