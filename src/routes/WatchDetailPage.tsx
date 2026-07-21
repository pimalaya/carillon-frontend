import { useParams } from "react-router-dom";

import { WatchDetail } from "@/features/watches/WatchDetail";

export function WatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <WatchDetail id={id} />;
}
