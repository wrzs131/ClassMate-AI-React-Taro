import { useState } from "react";
import { View, Text } from "@tarojs/components";
import { useReady } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { Input } from "@nutui/nutui-react-taro";
import { api, apiBase, DEFAULT_BASE, getToken, setApiBase, setToken, setUser } from "../../utils/api";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("student");
  const [password, setPassword] = useState("demo123456");
  const [nickname, setNickname] = useState("小明");
  const [base, setBase] = useState(apiBase());
  const [showBase, setShowBase] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // 已登录时不在挂载任何子组件，避免「挂载中就被 reLaunch 销毁」的问题
  const [loggedIn, setLoggedIn] = useState(!!getToken());

  // 首屏渲染完成（useReady）后再跳首页，等价于原 onReady 逻辑
  useReady(() => {
    if (loggedIn) {
      Taro.reLaunch({ url: "/pages/home/home" });
    }
  });

  function fillDemo() {
    setUsername("student");
    setPassword("demo123456");
    setNickname("小明");
  }

  async function submit() {
    setError("");
    if (!username.trim()) {
      setError("请输入账号");
      return;
    }
    setLoading(true);
    try {
      if (showBase) setApiBase(base.trim() || DEFAULT_BASE);
      const data =
        mode === "login"
          ? await api.login(username.trim(), password)
          : await api.register({
              role: "student",
              username: username.trim(),
              password: password,
              nickname: nickname.trim() || username.trim(),
            });
      setToken(data.token);
      setUser(data.user);
      Taro.reLaunch({ url: "/pages/home/home" });
    } catch (err: any) {
      setError(err?.message || "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className='page'>
      {loggedIn ? (
        <View className='card' style={{ marginTop: "60rpx" }}>
          <Text className='muted' style={{ lineHeight: 1.8 }}>
            已登录，正在返回首页…
          </Text>
        </View>
      ) : (
        <>
          <View className='hero'>
            <View className='row'>
              <Text className='hero-title'>
                课堂里的 AI 助教，<Text className='hl'>先提示再给答案</Text>
              </Text>
            </View>
            <Text className='hero-sub'>
              登录后输入老师给的 6 位课堂码即可进入课堂：看讲解、随时提问（可拍照上传手写步骤）、做随堂测验、查看错因报告。
            </Text>
          </View>

          <View className='card'>
            <View className='seg'>
              <View
                className={`seg-item ${mode === "login" ? "active" : ""}`}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                <Text>登录</Text>
              </View>
              <View
                className={`seg-item ${mode === "register" ? "active" : ""}`}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                <Text>注册</Text>
              </View>
            </View>

            <Text className='label' style={{ marginTop: "26rpx" }}>
              账号
            </Text>
            <Input value={username} placeholder='student' onChange={(v) => setUsername(String(v ?? ""))} />

            <Text className='label' style={{ marginTop: "20rpx" }}>
              密码
            </Text>
            <Input value={password} type='password' placeholder='demo123456' onChange={(v) => setPassword(String(v ?? ""))} />

            {mode === "register" && (
              <>
                <Text className='label' style={{ marginTop: "20rpx" }}>
                  昵称
                </Text>
                <Input value={nickname} placeholder='小明' onChange={(v) => setNickname(String(v ?? ""))} />
              </>
            )}

            {error ? <View className='error'>{error}</View> : null}

            <View
              className={`btn primary ${loading ? "disabled" : ""}`}
              style={{ marginTop: "26rpx" }}
              onClick={submit}
            >
              <Text>{loading ? "处理中…" : mode === "login" ? "进入课堂" : "注册并进入"}</Text>
            </View>

            <View className='row' style={{ justifyContent: "space-between", marginTop: "18rpx" }}>
              <View className='btn ghost' onClick={fillDemo}>
                <Text>填入演示账号</Text>
              </View>
            </View>

            <Text className='muted' style={{ display: "block", marginTop: "20rpx", lineHeight: 1.7 }} />
          </View>
        </>
      )}
    </View>
  );
}
