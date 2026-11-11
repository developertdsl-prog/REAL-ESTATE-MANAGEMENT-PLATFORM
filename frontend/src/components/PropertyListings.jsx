import React from 'react'
import PropertyCard from './PropertyCard'

const PropertyListings = () => {
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
    {
      id: 4,
      title: 'Spacious Family Home',
      price: '1.8M',
      location: 'Suburb, NJ',
      type: 'Sale',
      bedrooms: 5,
      bathrooms: 3,
      image: '/placeholder.svg?height=400&width=600'
    },
    {
      id: 5,
      title: 'Downtown Loft',
      price: '650K',
      location: 'Downtown, LA',
      type: 'Sale',
      bedrooms: 2,
      bathrooms: 2,
      image: '/placeholder.svg?height=400&width=600'
    },
    {
      id: 6,
      title: 'Beach House',
      price: '2.1M',
      location: 'Malibu, CA',
      type: 'Sale',
      bedrooms: 4,
      bathrooms: 3,
      image: '/placeholder.svg?height=400&width=600'
    },
  ]

  return (
    <section className="py-24 bg-navy-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-extrabold text-navy-800">
            Property Listings
          </h2>
          <button className="bg-gold-50 text-gold-600 px-4 py-2 rounded-md hover:bg-gold-100 transition-colors text-sm">
            View All
          </button>
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

export default PropertyListings