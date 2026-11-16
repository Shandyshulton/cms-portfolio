const METEORS = [1, 2, 3, 4];

export default function MeteorShower() {
  return (
    <>
      {METEORS.map((variant) => (
        <div key={variant} className={`meteor meteor-${variant}`} aria-hidden="true" />
      ))}
    </>
  );
}
