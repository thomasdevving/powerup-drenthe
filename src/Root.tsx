import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {FPS, HEIGHT, WIDTH} from './script';
import {Pitch} from './Pitch';
import {defaultTimeline, resolveTimeline, type PitchProps} from './timeline';

type Props = PitchProps & {guide?: boolean};

const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  const timeline = await resolveTimeline(props.durationOverrides ?? {});
  return {durationInFrames: timeline.totalFrames, props: {...props, timeline}};
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Pitch"
      component={Pitch}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={defaultTimeline().totalFrames}
      defaultProps={{durationOverrides: {}} as Props}
      calculateMetadata={calculateMetadata}
    />
    <Composition
      id="PitchVoGids"
      component={Pitch}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      durationInFrames={defaultTimeline().totalFrames}
      defaultProps={{durationOverrides: {}, guide: true} as Props}
      calculateMetadata={calculateMetadata}
    />
  </>
);
