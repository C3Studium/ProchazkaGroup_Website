export default function useResend() {
    const sendEmail = async ({ template, to, data = {} }) => {
        console.log('useResend called with:', { template, to, data });
        
        if (!template || !to) throw new Error("Missing template or to");
        
        const requestBody = { template, to, data };
        console.log('Sending to API:', requestBody);
        
        const res = await fetch("/api/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });
        
        const json = await res.json();
        console.log('API response:', { status: res.status, data: json });
        
        if (!res.ok) {
            const msg = json?.error || "Failed to send email";
            throw new Error(msg);
        }
        return json;
    };

    return { sendEmail };
}