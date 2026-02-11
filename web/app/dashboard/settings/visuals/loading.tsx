export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" />
      </div>
      <p className="text-sm text-gray-500 animate-pulse">Loading visuals...</p>
    </div>
  );
}
