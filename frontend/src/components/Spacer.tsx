type SpacerProps = {
  height: number | string;
};

const Spacer = ({ height }: SpacerProps) => {
  return <div style={{ height }} />;
};

export default Spacer;
