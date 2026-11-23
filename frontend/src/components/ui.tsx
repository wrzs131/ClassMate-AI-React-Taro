/** 公共业务组件：标签 / 折叠面板 / 加载提示 / 懒加载图片（替代原 uni-ui 对应组件，样式沿用原设计）。 */
import { useState } from "react";
import { View, Text, Image } from "@tarojs/components";

export type TagType = "success" | "warning" | "error" | "primary" | "info" | "default";

const TAG_CLASS: Record<TagType, string> = {
  success: "tag green",
  warning: "tag amber",
  error: "tag red",
  info: "tag grey",
  default: "tag grey",
  primary: "tag",
};

export function Tag({ text, type = "default" }: { text: string; type?: TagType }) {
  return <Text className={TAG_CLASS[type]}>{text}</Text>;
}

export function CollapseItem({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(open);
  return (
    <View className='collapse'>
      <View className='collapse-head' onClick={() => setExpanded(!expanded)}>
        <Text className='collapse-title'>{title}</Text>
        <Text className='muted'>{expanded ? "收起" : "展开"}</Text>
      </View>
      {expanded && <View className='collapse-body'>{children}</View>}
    </View>
  );
}

export function LoadMore({ text }: { text: string }) {
  return (
    <View className='empty'>
      <Text>{text}</Text>
    </View>
  );
}

/**
 * 懒加载图片：小程序端 lazy-load 仅在页面进入视口/临近视口时才发起请求，
 * 配合加载占位骨架，减少长页面的首屏请求量和渲染耗时（图片懒加载优化点）。
 */
export function LazyImage({
  src,
  mode,
  style,
}: {
  src: string;
  mode?: "scaleToFill" | "aspectFit" | "aspectFill" | "widthFix" | "heightFix";
  style?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <View className='lazy-image'>
      <Image
        src={src}
        mode={mode}
        style={{ ...style, opacity: loaded ? 1 : 0 }}
        lazyLoad
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {!loaded && (
        <View className='lazy-skeleton'>
          <Text className='muted'>{failed ? "图片加载失败" : "加载中…"}</Text>
        </View>
      )}
    </View>
  );
}
