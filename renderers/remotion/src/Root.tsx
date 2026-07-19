import {Composition} from 'remotion';

import rawProps from '../../../projects/vs-001-source-to-campaign/remotion/05-input-props.json';
import {MethodologiaVertical} from '../../../projects/vs-001-source-to-campaign/remotion/src/MethodologiaVertical.tsx';
import {NetworkGuardProbe} from './components/NetworkGuardProbe.tsx';
import {calculateMethodologiaVerticalMetadata, methodologiaVerticalPropsSchema} from './schema.ts';

const defaultProps = methodologiaVerticalPropsSchema.parse(rawProps);

export const RemotionRoot = () => (
  <>
    <Composition
      calculateMetadata={calculateMethodologiaVerticalMetadata}
      component={MethodologiaVertical}
      defaultProps={defaultProps}
      id="MethodologiaVertical"
      schema={methodologiaVerticalPropsSchema}
    />
    <Composition
      component={NetworkGuardProbe}
      durationInFrames={1}
      fps={30}
      height={180}
      id="NetworkGuardProbe"
      width={320}
    />
  </>
);
