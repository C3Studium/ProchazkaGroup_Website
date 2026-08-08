import Magnetic from "@/components/common/Magnetic";
import Image from "next/image";

export default function SmallButton({ text }) {
    return (
        <Magnetic sensitivity='0.01'>
            <div
                className='Small__button_container'
                data-cursor-target
            >
                <div className='Small__button_Bounds'></div>
                <div className="Small__button_Text">
                    <p>{text}</p>
                    <div className="Small__button_Arrow">
                        <Image
                            src="/assets/svg/Arrow.svg"
                            alt="arrow"
                            width={10}
                            height={10}
                        />
                    </div>
                </div>
            </div>
        </Magnetic>
    )
}