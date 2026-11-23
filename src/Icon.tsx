import Svg, { Path, Circle } from "react-native-svg";
type IconName =
  | "home"
  | "history"
  | "people"
  | "settings"
  | "plus"
  | "arrow"
  | "car"
  | "wallet"
  | "check"
  | "trash"
  | "edit"
  | "moon"
  | "sun"
  | "chevron"
  | "route"
  | "close"
  | "fuel"
  | "minus";

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <Path d="m3 10 9-7 9 7" />
      <Path d="M5 9v11h14V9M9 20v-6h6v6" />
    </>
  ),
  history: (
    <>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  people: (
    <>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  arrow: <Path d="m9 18 6-6-6-6" />,
  car: (
    <>
      <Path d="m5 17-1 2M19 17l1 2M3 13l2-6h14l2 6v5H3v-5Z" />
      <Circle cx="7" cy="15" r="1" />
      <Circle cx="17" cy="15" r="1" />
      <Path d="M5 11h14" />
    </>
  ),
  wallet: (
    <>
      <Path d="M3 6h15a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13" />
      <Path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5Z" />
    </>
  ),
  check: <Path d="m5 12 4 4L19 6" />,
  trash: (
    <>
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5" />
    </>
  ),
  edit: (
    <>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  moon: <Path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  chevron: <Path d="m9 18 6-6-6-6" />,
  route: (
    <>
      <Circle cx="6" cy="19" r="2" />
      <Circle cx="18" cy="5" r="2" />
      <Path d="M8 19h3a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3" />
    </>
  ),
  close: <Path d="m6 6 12 12M18 6 6 18" />,
  fuel: (
    <>
      <Path d="M4 22V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v18M2 22h15M6 6h7v5H6zM15 7h2l3 3v8a2 2 0 0 0 4 0v-5l-3-3" />
    </>
  ),
};

export function Icon({
  name,
  color,
  size = 20,
}: {
  name: IconName;
  color: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </Svg>
  );
}
export type { IconName };
