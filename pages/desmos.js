import { useEffect, useRef } from "react";

export const DesmosCalculator = ({ formula }) => {
  const desmosRef = useRef();

  useEffect(() => {
    if (desmosRef) {
      const calculator = Desmos.GraphingCalculator(desmosRef.current, {
        actions: "auto",
      });
      const cleared = formula.replace("`", "");

      calculator.setExpression({ id: "graph1", latex: cleared });
    }
  }, [desmosRef, formula]);

  return (
    <div
      ref={desmosRef}
      style={{
        width: 600,
        height: 400,
      }}
    ></div>
  );
};
