import type { MDXComponents } from "mdx/types";
import { CalloutBox } from "@/components/lesson/callout-box";
import { Eli5Box } from "@/components/lesson/eli5-box";
import { KeyTermsList } from "@/components/lesson/key-terms-list";
import { QuickCheckQuestion } from "@/components/lesson/quick-check-question";
import { TechnicalSection } from "@/components/lesson/technical-section";
import { TerminalBlock } from "@/components/lesson/terminal-block";

// Shared components available in every lesson MDX file without importing.
const components = {
  Eli5: Eli5Box,
  Callout: CalloutBox,
  KeyTerms: KeyTermsList,
  QuickCheck: QuickCheckQuestion,
  Technical: TechnicalSection,
  Terminal: TerminalBlock,
  table: (props) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
