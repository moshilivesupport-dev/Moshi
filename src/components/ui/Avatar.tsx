type Props = {
  src?: string;
  name?: string;
  size?: number;
  live?: boolean;
};

export default function Avatar({ src, name = "Moshi", size = 48, live = false }: Props) {
  return (
    <div
      className="relative shrink-0 rounded-full bg-gradient-to-br from-[#FF8FB1] via-[#9D7BEA] to-[#60A5FA] p-[2px]"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full border-2 border-white object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-gray-100 font-bold text-gray-600">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {live && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#FF8FB1] to-[#9D7BEA] px-2 py-0.5 text-[9px] font-bold text-white">
          LIVE
        </span>
      )}
    </div>
  );
}