import { useCallback, useState } from 'react'
import { supabase } from './supabaseClient'

export const useFetchDatabase = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [people, setPeople] = useState([])
    const [reviews, setReviews] = useState([])
    const [total, setTotal] = useState(null)

    const fetchPeople = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('people')
                .select('*')
                .order('id', { ascending: true })
            
            if (error) throw error
            setPeople(data)
            return data
        } catch (err) {
            setError(err.message)
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchClovek = useCallback(async (name) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('people')
                .select('*')
                .eq('name', name)
            
            if (error) throw error
            setPeople(data)
            return data
        }
        catch (err) {
            setError(err.message)
            return null
        } finally {
            setLoading(false)
        }

    }, [])

    const fetchClovekById = useCallback(async (id) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('people')
                .select('*')
                .eq('id', id)
            if (error) throw error
            return data
        }
        catch (err) {
            setError(err.message)
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false })
            
            if (error) throw error
            setReviews(data)
            return data
        } catch (err) {
            setError(err.message)
            return null
        } finally {
            setLoading(false)
        }
    },[])

    const fetchTotal = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('total')
                .select('*')
                .eq('id', "7d1cc7c4-b546-40a1-8e9e-97d0601e7b07")
                .single()
            
            if (error) throw error
            setTotal(data)
            return data
        } catch (err) {
            setError(err.message)
            return null
        } finally {
            setLoading(false)
        }
    },[])


    return {
        people,
        reviews,
        total,
        loading,
        error,
        fetchPeople,
        fetchReviews,
        fetchTotal,
        fetchClovek,
        fetchClovekById
    }
}