import React from 'react'

const PropertyDetails = () => {
  const property = {
    id: 1,
    title: 'Luxury Villa in Beverly Hills',
    price: '2.5M',
    location: 'Beverly Hills, CA',
    type: 'Sale',
    bedrooms: 4,
    bathrooms: 4,
    area: '5,200 sq ft',
    description: 'A stunning luxury villa featuring panoramic mountain views, premium finishes, and state-of-the-art amenities. This property offers the perfect blend of luxury and comfort with spacious living areas, a gourmet kitchen, and an elegant master suite.',
    features: ['Ocean views', 'Private pool', 'Home theater', 'Gym', '4-car garage'],
    image: '/placeholder.svg?height=600&width=800',
    gallery: [
      '/placeholder.svg?height=400&width=600',
      '/placeholder.svg?height=400&width=600',
      '/placeholder.svg?height=400&width=600'
    ]
  }

  return (
    <section className="py-24 bg-navy-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <img 
              src={property.image} 
              alt={property.title} 
              className="w-full rounded-lg shadow-2xl"
            />
            <div className="mt-6 grid grid-cols-3 gap-2">
              {property.gallery.map((img, index) => (
                <img 
                  key={index} 
                  src={img} 
                  alt={`Gallery ${index + 1}`} 
                  className="border rounded cursor-pointer hover:border-gold-300 transition-colors"
                />
              ))}
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-navy-800 mb-4">{property.title}</h1>
            <div className="flex items-baseline space-x-2 mb-6">
              <span className="text-3xl font-bold text-gold-500">${property.price}</span>
              <span className="text-navy-400 text-base">
                {property.type === 'sale' ? 'For Sale' : 'For Rent'}
              </span>
            </div>
            <p className="text-navy-500 text-lg mb-6 line-clamp-4">
              {property.description}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-white rounded border border-navy-100">
                <p className="text-navy-400 text-sm font-medium mb-1">Bedrooms</p>
                <p className="text-3xl font-bold text-navy-800">{property.bedrooms}</p>
              </div>
              <div className="p-4 bg-white rounded border border-navy-100">
                <p className="text-navy-400 text-sm font-medium mb-1">Bathrooms</p>
                <p className="text-3xl font-bold text-navy-800">{property.bathrooms}</p>
              </div>
              <div className="p-4 bg-white rounded border border-navy-100">
                <p className="text-navy-400 text-sm font-medium mb-1">Area</p>
                <p className="text-3xl font-bold text-navy-800">{property.area}</p>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-medium text-navy-700 mb-4">Key Features</h3>
              <div className="grid grid-cols-2 gap-2">
                {property.features.map((feature, index) => (
                  <span 
                    key={index} 
                    className="bg-gold-50 text-gold-600 text-sm rounded px-3 py-1 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 5v14M8 12l4 4 4-4" />
                    </svg>
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-medium text-navy-700 mb-4">Location</h3>
              <p className="text-navy-500 mb-2">
                <svg className="w-5 h-5 text-navy-400 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 2.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z" />
                </span>
                {property.location}
              </p>
              <button className="mt-4 bg-gold-600 text-white px-6 py-3 rounded-full hover:bg-gold-500 transition-colors text-sm">
                Contact Agent
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PropertyDetails