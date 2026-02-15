import { JSONUIProvider, Renderer, type Spec } from "@json-render/react";
import { onboardingRegistry } from "./registry";

type OnboardingRendererProps = {
  spec: Spec;
};

export default function OnboardingRenderer({
  spec,
}: OnboardingRendererProps) {
  return (
    <JSONUIProvider registry={onboardingRegistry}>
      <Renderer registry={onboardingRegistry} spec={spec} />
    </JSONUIProvider>
  );
}
