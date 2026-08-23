import type {CSSProperties} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

import {DiagramLayoutGuard} from './DiagramLayoutGuard.tsx';
import {compileDiagramModel} from './DiagramModel.ts';
import {DiagramPrimitives} from './DiagramPrimitives.tsx';

export interface DiagramStageProps {
  readonly diagram: unknown;
  readonly diagramSha256: string;
}

export const DiagramStage = ({diagram, diagramSha256}: DiagramStageProps) => {
  const frame = useCurrentFrame();
  const {durationInFrames: duration, height, width} = useVideoConfig();
  const model = compileDiagramModel(diagram, diagramSha256, {duration, frame, height, width});
  const safe = model.contract.stage.safe_zone;
  const poses = model.contract.required_poses;
  const pose =
    frame >= poses.closing_frame
      ? 'closing'
      : frame >= poses.connectors_complete_frame
        ? 'connectors-complete'
        : frame >= poses.components_settled_frame
          ? 'components-settled'
          : frame >= poses.container_frame
            ? 'container'
            : 'pre-container';
  const style: CSSProperties = {
    background: '#031a3a',
    height,
    overflow: 'hidden',
    position: 'relative',
    width,
  };
  return (
    <section
      aria-label="Diagrama explicativo MetodologIA"
      data-diagram-grammar={model.contract.grammar}
      data-diagram-pose={pose}
      data-diagram-root={model.binding}
      data-safe-zone={`${safe.x},${safe.y},${safe.width},${safe.height}`}
      style={style}
    >
      <DiagramPrimitives contract={model.contract} frame={model.frame} />
      <DiagramLayoutGuard diagram={diagram} diagramSha256={diagramSha256} />
    </section>
  );
};
