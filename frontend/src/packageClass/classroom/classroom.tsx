import { useRef, useState } from "react";
import { View, Text, Textarea } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { Tag, CollapseItem, LoadMore, LazyImage } from "../../components/ui";
import { api, getJoined, readImageBase64, requireLogin, setJoined } from "../../utils/api";

export default function Classroom() {
  const [state, setState] = useState<any>(null);
  const [joined, setJoinedState] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [pickedImage, setPickedImage] = useState("");
  const [askResult, setAskResult] = useState<any>(null);
  const timer = useRef<any>(null);

  const slide = state?.current_slide || null;
  const script = slide?.script || {};
  const latestQuiz = state?.latest_quiz || null;
  const finished = state?.session?.status === "finished";
  const events = (state?.events || []).slice(-8).reverse();

  useDidShow(() => {
    if (!requireLogin()) return;
    const j = getJoined();
    setJoinedState(j);
    if (!j?.id) {
      Taro.showModal({
        title: "还没加入课堂",
        content: "请先在首页输入老师给的 6 位课堂码。",
        showCancel: false,
        success: () => Taro.navigateBack(),
      });
      return;
    }
    load();
    startPolling();
  });

  // Taro 没有 useHide / useUnload，页面隐藏（含返回上一页）统一走 useDidHide 清理轮询
  useDidHide(stopPolling);

  async function load() {
    if (!joined?.id) return;
    setLoading(true);
    try {
      const data = await api.state(joined.id);
      setState(data);
      setError("");
      if (data?.session?.class_code) {
        const item = {
          id: data.session.id,
          class_code: data.session.class_code,
          lesson_title: data.lesson?.title,
        };
        setJoined(item);
        setJoinedState(item);
      }
    } catch (err: any) {
      const message = err?.message || "课堂信息加载失败";
      setError(message);
      // 学生已退出课堂（或在别处退班）后后端会拒绝访问，这里直接清理本地状态并返回首页
      if (String(message).includes("加入课堂")) {
        stopPolling();
        setJoined(null);
        setJoinedState(null);
        Taro.showToast({ title: "你已不在该课堂中", icon: "none" });
        setTimeout(() => Taro.reLaunch({ url: "/pages/home/home" }), 800);
      }
    } finally {
      setLoading(false);
    }
  }

  function startPolling() {
    stopPolling();
    timer.current = setInterval(load, 5000);
  }

  function stopPolling() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  async function chooseImage() {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ["compressed"] });
      const path = (res.tempFilePaths || [])[0];
      if (!path) return;
      setPickedImage(path);
      Taro.showToast({ title: "已选择图片，可补充说明后提问", icon: "none" });
    } catch {
      Taro.showToast({ title: "未选择图片", icon: "none" });
    }
  }

  async function ask() {
    if (!joined?.id) return;
    if (!question.trim() && !pickedImage) {
      Taro.showToast({ title: "先写下你卡住的地方", icon: "none" });
      return;
    }
    setAsking(true);
    try {
      let base64 = "";
      if (pickedImage) {
        try {
          base64 = await readImageBase64(pickedImage);
        } catch {
          Taro.showToast({ title: "图片读取失败，改为文字提问", icon: "none" });
        }
      }
      const data: any = await api.ask(joined.id, question.trim(), base64 || undefined);
      setAskResult(data);
      setQuestion("");
      setPickedImage("");
      load();
    } catch (err: any) {
      Taro.showModal({ title: "提问失败", content: err?.message || "请稍后重试", showCancel: false });
    } finally {
      setAsking(false);
    }
  }

  function goQuiz() {
    if (!latestQuiz) return;
    Taro.navigateTo({ url: `/packageClass/quiz/quiz?quiz_id=${latestQuiz.id}` });
  }

  function openReport() {
    if (!latestQuiz) return;
    Taro.navigateTo({ url: `/packageClass/report/report?quiz_id=${latestQuiz.id}` });
  }

  function goMe() {
    Taro.navigateTo({ url: "/packageClass/me/me" });
  }

  function eventTagType(e: any): "success" | "warning" | "default" {
    if (e?.role === "student") return "success";
    if (e?.role === "teacher") return "warning";
    return "default";
  }

  function difficultyTagType(d: string): "success" | "warning" | "error" {
    return d === "hard" ? "error" : d === "medium" ? "warning" : "success";
  }

  function difficultyLabel(d: string): string {
    return d === "hard" ? "较难" : d === "medium" ? "中等" : "容易";
  }

  function eventLabel(e: any): string {
    const map: Record<string, string> = {
      slide_start: "翻到新一页",
      teacher_speak: "老师讲解",
      student_questions: "AI 同学提问",
      assistant_answer: "助教提示",
      student_question: "同学提问",
      quiz_push: "随堂测验",
      quiz_submitted: "提交测验",
      summary: "课堂总结",
      class_started: "课堂开始",
      student_joined: "同学入班",
    };
    return map[e?.type] || e?.type || "";
  }

  function eventText(e: any): string {
    const p = e?.payload || {};
    switch (e?.type) {
      case "slide_start":
        return `第 ${(p.index ?? 0) + 1} 页 · ${p.title || ""}`;
      case "teacher_speak":
        return `${p.title || ""}：${(p.script?.analogy || "").slice(0, 60)}`;
      case "student_questions":
        return (p.questions || []).map((q: any) => q.question).join(" / ").slice(0, 80);
      case "student_question":
        return `${p.nickname || "同学"}：${(p.question || "").slice(0, 60)}`;
      case "assistant_answer":
        return `${p.nickname ? p.nickname + " → " : ""}${(p.reply?.probing_question || "").slice(0, 70)}`;
      case "quiz_push":
        return `${p.kp || ""} · ${p.item_count || 0} 题，满分 ${p.max_score || 0}`;
      case "quiz_submitted":
        return `${p.percent ?? 0}% 正确率`;
      case "summary":
        return (p.text || "").slice(0, 90);
      case "class_started":
        return `课堂码 ${p.class_code || ""} · ${p.lesson_title || ""}`;
      case "student_joined":
        return `${p.nickname || "同学"} 加入了课堂`;
      default:
        return "";
    }
  }

  return (
    <View className='page'>
      <View className='hero'>
        <Text className='hero-title'>{state?.lesson?.title || joined?.lesson_title || "互动课堂"}</Text>
        <Text className='hero-sub'>
          {state?.lesson?.chapter || "有理数的加减运算"} · {state?.lesson?.grade || "七年级"}
          {state ? ` · 第 ${(state.session.current_slide || 0) + 1} / ${state.session.slide_count} 页` : ""}
        </Text>
        <View className='row' style={{ marginTop: "18rpx" }}>
          <Text className='code-big' style={{ fontSize: "32rpx", padding: "8rpx 18rpx", letterSpacing: "4rpx" }}>
            {state?.session?.class_code || joined?.class_code}
          </Text>
          {finished ? <Tag text='课堂已结束' type='warning' /> : <Tag text='进行中' type='success' />}
        </View>
      </View>

      {error ? <View className='error'>{error}</View> : null}
      {finished ? <View className='notice'>本节课已结束，你仍可以回看讲解、做随堂测验和查看学情报告。</View> : null}

      {latestQuiz ? (
        <View className='card'>
          <View className='card-title'>
            <Text>随堂测验</Text>
            <Tag text={state?.quiz_submitted ? "已提交" : "待完成"} type={state?.quiz_submitted ? "success" : "warning"} />
          </View>
          <Text className='muted' style={{ display: "block", marginBottom: "18rpx" }}>
            共 5 题，覆盖容易 / 中等 / 较难，题目优先取自参考试卷。
          </Text>
          {state?.quiz_submitted ? (
            <View className='btn primary' onClick={openReport}>
              <Text>查看本次报告</Text>
            </View>
          ) : (
            <View className='btn blue' onClick={goQuiz}>
              <Text>去答题</Text>
            </View>
          )}
        </View>
      ) : null}

      {slide ? (
        <View className='card'>
          <View className='card-title'>
            <Text>{slide.title}</Text>
            <Tag text={slide.kp} type='primary' />
          </View>
          <Text className='label'>本页要点</Text>
          {(slide.bullets || []).map((b: string, i: number) => (
            <Text key={i} className='bullet'>
              · {b}
            </Text>
          ))}

          <View style={{ marginTop: "18rpx" }}>
            {script.analogy ? (
              <CollapseItem title='生活类比' open>
                <View className='script-block'>
                  <Text className='script-text'>{script.analogy}</Text>
                </View>
              </CollapseItem>
            ) : null}
            {(script.derivation_steps || []).length ? (
              <CollapseItem title='分步推导'>
                <View className='script-block'>
                  {script.derivation_steps.map((s: string, i: number) => (
                    <Text key={i} className='script-text'>
                      {i + 1}. {s}
                    </Text>
                  ))}
                </View>
              </CollapseItem>
            ) : null}
            {(script.pitfalls || []).length ? (
              <CollapseItem title='易错点 / 反例'>
                <View className='script-block'>
                  {script.pitfalls.map((s: string, i: number) => (
                    <Text key={i} className='script-text'>
                      ✗ {s}
                    </Text>
                  ))}
                </View>
              </CollapseItem>
            ) : null}
            {script.exam_application ? (
              <CollapseItem title='真题应用'>
                <View className='script-block'>
                  <Text className='script-text'>{script.exam_application}</Text>
                </View>
              </CollapseItem>
            ) : null}
          </View>

          {(slide.exam_anchors || []).length ? (
            <View style={{ marginTop: "22rpx" }}>
              <Text className='label'>本页配套题目（不含答案，先自己想一想）</Text>
              {slide.exam_anchors.map((item: any) => (
                <View key={item.id} className='script-block' style={{ borderLeftColor: "#1f5fb4" }}>
                  <Text className='script-text'>{item.stem}</Text>
                  <View className='row' style={{ marginTop: "10rpx" }}>
                    <Tag text={difficultyLabel(item.difficulty)} type={difficultyTagType(item.difficulty)} />
                    <Tag
                      text={item.source_type === "reference_paper" ? "参考试卷" : "教材改编"}
                      type={item.source_type === "reference_paper" ? "success" : "default"}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View className='card'>
          {loading ? <LoadMore text='正在同步课堂…' /> : <View className='empty'>等待老师开始讲解…</View>}
        </View>
      )}

      <View className='card'>
        <View className='card-title'>
          <Text>向助教提问</Text>
          <Text className='muted'>先给提示，不直接给答案</Text>
        </View>
        <Textarea
          value={question}
          onInput={(e) => setQuestion(e.detail.value)}
          className='textarea'
          maxlength={300}
          placeholder='比如：(-8)+3 为什么等于 -5？我是先算 8+3 的…'
        />
        {pickedImage ? (
          <View className='row' style={{ marginTop: "14rpx" }}>
            <LazyImage src={pickedImage} mode='aspectFill' style={{ width: "120rpx", height: "120rpx", borderRadius: "12rpx" }} />
            <Text className='muted' onClick={() => setPickedImage("")}>
              移除
            </Text>
          </View>
        ) : null}
        <View className='row' style={{ marginTop: "18rpx" }}>
          <View className='btn' style={{ flex: 1 }} onClick={chooseImage}>
            <Text>拍题上传</Text>
          </View>
          <View className='btn primary' style={{ flex: 1 }} onClick={ask}>
            <Text>{asking ? "助教思考中…" : "发送提问"}</Text>
          </View>
        </View>

        {askResult ? (
          <View className='reply'>
            <View className='row'>
              <Tag text={`提示 ${(askResult.hint_level || 0) + 1} / 4`} type='primary' />
              <Text className='muted'>再追问一次，会得到更具体的提示</Text>
            </View>
            {askResult.reply?.probing_question ? (
              <Text className='reply-q'>{askResult.reply.probing_question}</Text>
            ) : null}
            {askResult.reply?.analogy ? (
              <Text className='script-text' style={{ marginTop: "10rpx" }}>
                类比：{askResult.reply.analogy}
              </Text>
            ) : null}
            {(askResult.reply?.steps || []).map((s: string, i: number) => (
              <Text key={i} className='script-text'>
                {i + 1}. {s}
              </Text>
            ))}
            {askResult.reply?.final_answer ? <Text className='reply-final'>{askResult.reply.final_answer}</Text> : null}
            {(askResult.citations || []).length ? (
              <View style={{ marginTop: "12rpx" }}>
                <Text className='muted'>依据知识库：</Text>
                {askResult.citations.map((c: any, i: number) => (
                  <Text key={i} className='script-text'>
                    [{i + 1}] {(c.source || c.kind || "知识库")}（相关度 {c.score}）
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View className='card'>
        <View className='card-title'>
          <Text>课堂动态</Text>
          <View className='row' onClick={load}>
            <Text className='muted'>刷新</Text>
          </View>
        </View>
        {!events.length ? <View className='empty'>还没有动态，等老师开始上课。</View> : null}
        {events.map((e: any) => (
          <View key={e.seq} className='event'>
            <View className='row'>
              <Tag text={eventLabel(e)} type={eventTagType(e)} />
            </View>
            <Text className='event-text'>{eventText(e)}</Text>
          </View>
        ))}
      </View>

      <View className='row' style={{ marginTop: "8rpx" }}>
        <View className='btn ghost' style={{ flex: 1 }} onClick={load}>
          <Text>{loading ? "刷新中…" : "刷新课堂"}</Text>
        </View>
        <View className='btn ghost' style={{ flex: 1 }} onClick={goMe}>
          <Text>我的学情</Text>
        </View>
      </View>
    </View>
  );
}
