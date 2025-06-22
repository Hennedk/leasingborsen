import React from 'react'
import { Form } from '@/components/ui/form'
import type { UseFormReturn } from 'react-hook-form'
import type { CarListingFormData } from '@/lib/validations'

interface AdminFormLayoutProps {
  form: UseFormReturn<CarListingFormData>
  onSubmit: (data: CarListingFormData) => Promise<void> | void
  children: React.ReactNode
  className?: string
}

/**
 * AdminFormLayout - Wrapper component for admin form structure
 * Provides consistent form layout and handles form submission
 */
export const AdminFormLayout = React.memo<AdminFormLayoutProps>(({
  form,
  onSubmit,
  children,
  className = "space-y-8"
}) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto pb-8 px-0 max-w-6xl">
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className={className}
            noValidate
          >
            {children}
            
            {/* Footer Spacing */}
            <div className="py-8" aria-hidden="true"></div>
          </form>
        </Form>
      </div>
    </div>
  )
})

AdminFormLayout.displayName = 'AdminFormLayout'