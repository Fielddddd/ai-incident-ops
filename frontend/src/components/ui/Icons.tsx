import type { ReactNode } from "react";

function Svg({ size = 16, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const BotIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 8V4M9 13v1M15 13v1" />
  </Svg>
);
export const RefreshIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Svg>
);
export const InfoIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </Svg>
);
export const DocIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
  </Svg>
);
export const CopyIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Svg>
);
export const CheckIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="m5 12 5 5L20 7" />
  </Svg>
);
export const ThumbUpIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M7 10v11H3V10zM7 10l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 19H7" />
  </Svg>
);
export const ThumbDownIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M17 14V3h4v11zM17 14l-4 8a2 2 0 0 1-2-2v-4H5a2 2 0 0 1-2-2.3l1.3-7A2 2 0 0 1 6.3 5H17" />
  </Svg>
);
export const SendIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4z" />
  </Svg>
);
