import type { Metadata } from "next";
import dynamic from "next/dynamic";

const StudyFlow = dynamic(() => import("@/components/study/StudyFlow").then((mod) => mod.StudyFlow), { ssr: false });

export const metadata: Metadata = {
  title: "The study",
  description: "Six anonymous minutes on natural selection. Read, or play, then answer the same questions.",
};

export default function StudyPage() {
  return <StudyFlow />;
}
