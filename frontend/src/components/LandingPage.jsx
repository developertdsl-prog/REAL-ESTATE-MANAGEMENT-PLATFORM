import React from 'react'
import PropertyCard from './PropertyCard'

const LandingPage = () => {
  const properties = [
    {
      id: 1,
      title: 'Luxury Villa in Beverly Hills',
      price: '2.5M',
      location: 'Beverly Hills, CA',
      type: 'Sale',
      bedrooms: 4,
      bathrooms: 4,
      image: '/placeholder.svg?height=400&width=600'
    },
    {
      id: 2,
      title: 'Modern Apartment Downtown',
      price: '850K',
      location: 'Downtown, NY',
      type: 'Sale',
      bedrooms: 2,
      bathrooms: 2,
      image: '/placeholder.svg?height=400&width=600'
    },
    {
      id: 3,
      title: 'Beachfront Condo',
      price: '1.2M',
      location: 'Miami Beach, FL',
      type: 'Sale',
      bedrooms: 3,
      bathrooms: 3,
      image: '/placeholder.svg?height=400&width=600'
    },
  ]

  return (
    <section className="py-24 bg-navy-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-navy-800 mb-4">
            Find Your Dream Property
          </h1>
          <p className="text-navy-400 text-lg max-w-2xl mx-auto">
            Explore premium properties worldwide. Whether you're looking to buy or rent,
            we have the perfect home for you.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default LandingPage