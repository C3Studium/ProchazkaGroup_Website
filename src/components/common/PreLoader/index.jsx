import { motion } from "framer-motion";
import Grid from "../grid";
import AnimatedText from "../TextAnim/typingText";
export default function Preloader() {

    return (
        <motion.div className="Preloader__Main">
            <div className="Preloader__text">
                <h1>
                    <AnimatedText
                        text="Procházka Group"
                    />
                </h1>
                <p>
                    <AnimatedText
                        text="Finance a vzdělání"
                    />
                </p>
            </div>
            <Grid />
        </motion.div>
    );
};
