import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useFetchDatabase } from './useFetchDatabase'

export const useReviewForm = () => {

    const {fetchClovek} = useFetchDatabase()
    const [formData, setFormData] = useState({
        customerName: '',
        email: '',
        reviewType: '', // Will be either 'poradce' or 'benefitprogram'
        consultantName: '', // The selected person's name
        consultantId: '', 
        message: '',
    })
    const [loading, setLoading] = useState(false)

    const validateForm = () => {
        if (!formData.customerName.trim()) {
            return { isValid: false, message: 'Prosím vyplňte jméno' }
        }

        if (!formData.email.trim()) {
            return { isValid: false, message: 'Prosím vyplňte email' }
        }

        if (!formData.message.trim()) {
            return { isValid: false, message: 'Prosím napište váš názor' }
        }

        if (!formData.consultantName) {
            return { isValid: false, message: 'Prosím vyberte poradce' }
        }

        return { isValid: true }
    }

    const handleSubmit = async () => {
        console.log('Review submission started with:', formData)
        setLoading(true)

        const validation = validateForm()
        if (!validation.isValid) {
            setLoading(false)
            return { success: false, message: validation.message }
        }
        

        try {
            const reviewObject = {
                customer_name: formData.customerName,
                hashtag: formData.consultantName === "Benefit Program" ? "benefitprogram" : "poradce",
                consultant_name: formData.consultantName,
                message: formData.message,
            }
    
            // this is only to update the database, not the UI, not to be called
            const { data, error } = await supabase
                .from('reviews')
                .insert([reviewObject])
    
            if (error) throw error

            const { data: totalData, error: totalError } = await supabase
                .from('total')
                .select('totalpeople, reviews')
                .eq('id', "7d1cc7c4-b546-40a1-8e9e-97d0601e7b07")



            const TotalObject = {
                totalpeople: totalData[0].totalpeople + 1,
                reviews: totalData[0].reviews + 1
            }

            const { data: totalDataUpdate, error: totalErrorUpdate } = await supabase
                .from('total')
                .update(TotalObject)
                .eq('id', "7d1cc7c4-b546-40a1-8e9e-97d0601e7b07")

            const peopledata = await fetchClovek(formData.consultantName)

            if (!peopledata || !peopledata[0]) {
                setLoading(false)
                return { success: false, message: "Poradce nebyl nalezen v databázi." }
            }
            const { data: peopleData, error: peopleError } = await supabase
            .from('people')
            .update({ reviews: peopledata[0].reviews + 1 })
            .eq('name', formData.consultantName)

            console.log("reviews:", peopleData)
        
            if (peopleError) throw peopleError

            setFormData({
                customerName: '',
                email: '',
                reviewType: '',
                consultantName: '',
                consultantId: '',
                message: ''
            })
    
            return { success: true, message: 'Děkujeme za váš názor!' }
        } catch (err) {
            console.error('Review submission failed:', err)
            return { success: false, message: 'Něco se pokazilo, zkuste to prosím znovu' }
        } finally {
            setLoading(false)
        }
    }

    return { formData, setFormData, loading, handleSubmit }
}