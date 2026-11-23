import { useState } from "react";
import { View, Text } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { Input } from "@nutui/nutui-react-taro";
import { Tag } from "../../components/ui";
import { api, clearAuth, getJoined, getUser, requireLogin, setJoined } from "../../utils/api";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [joined, setJoinedState] = useState<any>(null);
  const [joinedStatus, setJoinedStatus] = useState("active");
  const [classCode, setClassCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    if (!requireLogin()) return;
    setUser(getUser());
    // 「加入的课堂」按账号分开存：切回自己的账号，之前加入的课堂依然在
    setJoinedState(getJoined());
    setJoinedStatus("active");
    validateJoined();
  });

  /** 课堂可能已被老师结束/关闭，或自己已退班：回首页时校验一次，避免显示一个进不去的课堂 */
  async function validateJoined() {
    const item = joined;
    if (!item?.id) return;
    try {
      const data: any = await api.state(item.id);
      setJoinedStatus(data?.session?.status || "active");
    } catch (err: any) {
      if (String(err?.message || "").includes("加入课堂")) {
        setJoined(null);
        setJoinedState(null);
      }
    }
  }

  async function join() {
    setError("");
    const code = classCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("课堂码是 6 位数字，请检查后重试");
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.join(code);
      const item = {
        id: data.session.id,
        class_code: data.session.class_code,
        lesson_title: data.lesson?.title,
      };
      setJoined(item);
      setJoinedState(item);
      Taro.navigateTo({ url: "/packageClass/classroom/classroom" });
    } catch (err: any) {
      setError(err?.message || "加入课堂失败");
    } finally {
      setLoading(false);
    }
  }

  function enterClass() {
    Taro.navigateTo({ url: "/packageClass/classroom/classroom" });
  }

  function openMe() {
    Taro.navigateTo({ url: "/packageClass/me/me" });
  }

  function leaveClass() {
    const current = joined;
    Taro.showModal({
      title: "退出课堂？",
      content: "退出后老师端会看到你已离开课堂，重新进入需要输入课堂码。",
      success: async (res) => {
        if (!res.confirm) return;
        // 必须同步到后端，否则教师端成员列表与课堂事件流不会变化
        if (current?.id) {
          try {
            await api.leave(current.id);
          } catch (err: any) {
            Taro.showToast({ title: err?.message || "退出同步失败", icon: "none" });
          }
        }
        setJoined(null);
        setJoinedState(null);
      },
    });
  }

  function logout() {
    clearAuth();
    // 不再清「加入的课堂」：记录按账号分别存储，切回自己的账号时课堂卡片应当还在
    setJoinedState(null);
    Taro.reLaunch({ url: "/pages/login/login" });
  }

  return (
    <View className='page'>
      <View className='hero'>
        <View className='row'>
          <Text className='hero-title'>你好，{user?.nickname || "同学"}</Text>
        </View>
        <Text className='hero-sub'>
          今天的课是《有理数的加减运算》。跟着老师一步步看符号、算绝对值，遇到不会的先点“提问”，助教会先给你提示。
        </Text>
      </View>

      {joined ? (
        <View className='card'>
          <View className='card-title'>
            <Text>我的课堂</Text>
            {joinedStatus === "closed" ? (
              <Tag text='课堂已关闭' type='info' />
            ) : joinedStatus === "finished" ? (
              <Tag text='课堂已结束' type='warning' />
            ) : (
              <Tag text='已加入' type='success' />
            )}
          </View>
          <Text style={{ fontSize: "30rpx", fontWeight: 700, display: "block" }}>
            {joined.lesson_title || "互动课堂"}
          </Text>
          <Text className='muted' style={{ display: "block", marginTop: "8rpx" }}>
            课堂码 {joined.class_code}
          </Text>

          <View className='row' style={{ marginTop: "24rpx" }}>
            <View className='btn blue' style={{ flex: 1 }} onClick={enterClass}>
              <Text>进入课堂</Text>
            </View>
            <View className='btn' style={{ flex: 1 }} onClick={openMe}>
              <Text>我的学情</Text>
            </View>
          </View>
          <View className='btn ghost' style={{ marginTop: "12rpx" }} onClick={leaveClass}>
            <Text>退出课堂</Text>
          </View>
        </View>
      ) : (
        <View className='card'>
          <View className='card-title'>
            <Text>加入课堂</Text>
            <Text className='muted'>输入老师给的 6 位课堂码</Text>
          </View>
          <Input
            value={classCode}
            type='number'
            placeholder='例如 507921'
            maxLength={6}
            onChange={(v) => setClassCode(String(v ?? ""))}
          />
          {error ? <View className='error'>{error}</View> : null}
          <View className={`btn primary ${loading ? "disabled" : ""}`} style={{ marginTop: "24rpx" }} onClick={join}>
            <Text>{loading ? "加入中…" : "加入课堂"}</Text>
          </View>
          <Text className='muted' style={{ display: "block", marginTop: "18rpx", lineHeight: 1.7 }}>
            课堂码在教师端「授课控制台」开课后显示，只对进行中的课堂有效。
          </Text>
        </View>
      )}

      <View className='card'>
        <View className='card-title'>
          <Text>我的学习</Text>
          <Text className='muted'>掌握度 · 错因 · 推荐题</Text>
        </View>
        <View className='row'>
          <View className='btn' style={{ flex: 1 }} onClick={openMe}>
            <Text>查看学情报告</Text>
          </View>
          <View className='btn ghost' style={{ flex: 1 }} onClick={logout}>
            <Text>退出登录</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
