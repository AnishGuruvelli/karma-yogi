const colorMap: Record<string, { bg: string; text: string }> = {
  cyan: { bg: "bg-neon-cyan/20", text: "text-neon-cyan" },
  green: { bg: "bg-neon-green/20", text: "text-neon-green" },
  orange: { bg: "bg-neon-orange/20", text: "text-neon-orange" },
  pink: { bg: "bg-neon-pink/20", text: "text-neon-pink" },
  purple: { bg: "bg-neon-purple/20", text: "text-neon-purple" },
};

interface UserLike {
  name: string;
  avatarColor?: string;
}

interface Props {
  user: UserLike;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

export function UserAvatar({ user, size = "md", ring = false }: Props) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = colorMap[user.avatarColor ?? "purple"] || colorMap.purple;
  return (
    <div className={`flex items-center justify-center rounded-full font-bold ${color.bg} ${color.text} ${sizeMap[size]} ${ring ? "ring-2 ring-background" : ""}`}>
      {initials}
    </div>
  );
}
