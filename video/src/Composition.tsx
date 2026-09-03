import {
  AbsoluteFill,
  Composition,
  Easing,
  Interactive,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";

type Props = {
  title: string;
  subtitle: string;
};

export const MyComposition = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        title: "Levela",
        subtitle: "Remotion で動画をつくる",
      }}
    />
  );
};

export const MyComponent: React.FC<Props> = ({ title, subtitle }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1020" }}>
      <Sequence name="Background">
        <Background />
      </Sequence>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 48,
          padding: "160px 140px",
        }}
      >
        <Sequence name="Title" from={10} layout="none">
          <Title text={title} />
        </Sequence>
        <Sequence name="Subtitle" from={30} layout="none">
          <Subtitle text={subtitle} />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      name="Glow"
      style={{
        position: "absolute",
        width: 1400,
        height: 1400,
        left: 260,
        top: -160,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(11,16,32,0) 65%)",
        scale: interpolate(frame, [0, 180], [0.9, 1.15], {
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    />
  );
};

const Title: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      name="Hero title"
      style={{
        fontFamily: "sans-serif",
        fontSize: 150,
        fontWeight: 800,
        color: "white",
        textAlign: "center",
        letterSpacing: -4,
        opacity: interpolate(frame, [0, 25], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: interpolate(frame, [0, 25], ["0px 60px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {text}
    </Interactive.Div>
  );
};

const Subtitle: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      name="Subtitle"
      style={{
        fontFamily: "sans-serif",
        fontSize: 64,
        fontWeight: 500,
        color: "#9fb3d1",
        textAlign: "center",
        opacity: interpolate(frame, [0, 25], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: interpolate(frame, [0, 25], ["0px 40px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {text}
    </Interactive.Div>
  );
};
