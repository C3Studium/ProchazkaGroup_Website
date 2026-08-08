import Link from "next/link";
import Magnetic from "@/components/common/Magnetic";

export default function MyButton() {
    return (
        <Magnetic sensitivity='0.01'>
            <div
                className='My__button_container'
            >
                <div className='My__button_Bounds'></div>
                <Link href='https://matejforejt.com/' className="logo">
                    <p className="copyright">©</p>
                    <div className="name">
                        <p className="codeBy">Kód od</p>
                        <p className="C3">C3</p>
                        <p className="Studium">Studium</p>
                    </div>
                </Link>
            </div>
        </Magnetic>
    )
}