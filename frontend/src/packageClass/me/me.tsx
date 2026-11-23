import { useState } from "react";
import { View, Text } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { Tag, LoadMore } from "../../components/ui";
import { api, getJoined, getUser, requireLogin } from "../../utils/api";

export default function Me() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  useDidShow(() => {
    if (!requireLogin()) return;
    setUser(getUser());
    load();
  });

  const mastery = data?.mastery || [];
  const attempts = data?.attempts || [];
  const recommended = (data?.recommended || []).slice(0, 5);

  async function load() {
    setLoading(true);
    try {
      setData(await api.myDiagnosis());
      setError("");
    } catch (err: any) {
      setError(err?.message || "学情加载失败");
    } finally {
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
    if (getJoined()?.id) Taro.navigateTo({ url: "/packageClass/classroom/classroom" });
    else Taro.reLaunch({ url: "/pages/home/home" });
  }

  function backHome() {
    Taro.reLaunch({ url: "/pages/home/home" });
  }

  return (
    <View className='page'>
      <View className='hero'>
        <Text className='hero-title'>{data?.student?.nickname || user?.nickname || "同学"} 的学情画像</Text>
        <Text className='hero-sub'>掌握度按难度加权更新；薄弱点会自动推荐同知识点练习。</Text>
      </View>

      {error ? <View className='error'>{error}</View> : null}
      {loading ? <LoadMore text='正在生成诊断…' /> : null}

      {data ? (
        <>
          <View className='card'>
            <View className='card-title'>
              <Text>诊断建议</Text>
              <Tag text='学习路径' type='warning' />
            </View>
            <Text className='summary'>{data.summary}</Text>
            {data.weak_points?.length ? (
              <View className='row' style={{ marginTop: "16rpx" }}>
                <Text className='muted'>薄弱知识点</Text>
                {data.weak_points.map((kp: string) => (
                  <Tag key={kp} text={kp} type='error' />
                ))}
              </View>
            ) : null}
          </View>

          <View className='card'>
            <View className='card-title'>
              <Text>知识点掌握度</Text>
              <Text className='muted'>共 {mastery.length} 个知识点</Text>
            </View>
            {!mastery.length ? <View className='empty'>还没有作答记录，先完成一次随堂测验。</View> : null}
            {mastery.map((row: any) => (
              <View key={row.kp} className='kp-row'>
                <View className='row'>
                  <Text className='kp-name'>{row.kp}</Text>
                  <Tag text={masteryLabel(row.score)} type={barType(row.score)} />
                  <Text className='muted'>
                    {Math.round(Number(row.score) * 100)}% · {row.attempts} 次
                  </Text>
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

          {data.error_counts && Object.keys(data.error_counts).length ? (
            <View className='card'>
              <View className='card-title'>
                <Text>错因分布</Text>
                <Text className='muted'>老师端同步可见</Text>
              </View>
              <View className='row'>
                {Object.keys(data.error_counts).map((key) => (
                  <Tag key={key} text={`${key} × ${data.error_counts[key]}`} type='error' />
                ))}
              </View>
            </View>
          ) : null}

          <View className='card'>
            <View className='card-title'>
              <Text>最近作答</Text>
              <Text className='muted'>最近 20 条</Text>
            </View>
            {!attempts.length ? <View className='empty'>暂无作答记录</View> : null}
            {attempts.map((row: any) => (
              <View key={row.id} className='attempt'>
                <View className='row'>
                  <Tag text={row.correct ? "正确" : "错误"} type={row.correct ? "success" : "error"} />
                  <Tag text={row.kp} type='default' />
                  {row.error_type ? <Text className='muted'>{row.error_type}</Text> : null}
                </View>
                <Text className='stem'>{row.stem}</Text>
                <Text className='muted' style={{ display: "block", marginTop: "8rpx" }}>
                  我的答案：{row.answer || "（未作答）"}
                </Text>
              </View>
            ))}
          </View>

          {recommended.length ? (
            <View className='card'>
              <View className='card-title'>
                <Text>为你推荐的练习</Text>
                <Tag text={`${recommended.length} 题`} type='success' />
              </View>
              {recommended.map((rec: any, i: number) => (
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
            <View className='btn' style={{ flex: 1 }} onClick={backHome}>
              <Text>首页</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
