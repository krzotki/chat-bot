import { useEffect, useRef } from "react";
import styles from "./desmos.module.css";

export const DesmosCalculator = ({ formulas }) => {
  const desmosRef = useRef();

  useEffect(() => {
    if (desmosRef) {
      const calculator = Desmos.GraphingCalculator(desmosRef.current, {
        actions: "auto",
      });
      formulas.forEach((formula, index) => {
        const cleared = formula.replace("`", "");

        calculator.setExpression({ id: "graph_" + index, latex: cleared });
      });

      return () => {
        calculator.destroy();
      };
    }
  }, [desmosRef, formulas]);

  return <div className={styles.desmos} ref={desmosRef}></div>;
};
