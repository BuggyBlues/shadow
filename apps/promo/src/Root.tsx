import { Composition } from 'remotion'
import { PromoVideo } from './PromoVideo'
import { slideDuration, slides } from './slides'

export function RemotionRoot() {
  return (
    <Composition
      component={PromoVideo}
      durationInFrames={slides.length * slideDuration}
      fps={30}
      height={1080}
      id="ShadowCloudKingdom"
      width={1920}
    />
  )
}
