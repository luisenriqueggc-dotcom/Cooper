import { demo } from "@/lib/demo";
import { Workspace } from "@/components/workspace";
export default function Page() {
  return <Workspace initial={demo} admin demo />;
}
