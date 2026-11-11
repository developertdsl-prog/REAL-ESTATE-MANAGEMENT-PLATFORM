import React from 'react'

const PropertyCard = ({ property, onViewDetails }) => {
  return (
    <div className="group bg-white rounded-lg overflow-shadow border border-navy-100 hover:shadow-lg hover:border-gold-200 transition-all duration-300 max-w-sm">
      <div className="relative h-64 overflow-hidden rounded-t-lg">
        <img 
          src={property.image} 
          alt={property.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3 flex items-center space-x-2">
          <span className="bg-gold-100 text-gold-600 text-xs font-medium px-2.5 py-0.5 rounded">
            {property.type}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-xl font-medium text-navy-800 line-clamp-2 mb-2">{property.title}</h3>
        <p className="text-sm text-navy-400 line-clamp-2 mb-4">{property.location}</p>
        <div className="flex justify-between items-baseline">
          <span className="text-gold-500 font-bold text-lg">${property.price}</span>
          <span className="text-navy-400 text-sm">
            {property.type === 'sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
        <div className="mt-4 flex items-center space-x-2 text-navy-400 text-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 2l-2-2m0 0l-6.7-6.7a2.4 2.4 0 0 0-3.4 0L3 13l5.3 5.3a2.4 2.4 0 0 0 3.4 0L21 9z" />
          </svg>
          {property.bedrooms} Bed
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 2l-2-2m0 0l-6.7-6.7a2.4 2.4 0 0 0-3.4 0L3 13l5.3 5.3a2.4 2.4 0 0 0 3.4 0L21 9z" />
          </svg>
          {property.bathrooms} Bath
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v8l8 5-1.6 3L22 21l-2-2-7.3 4.8 1.5 2.9-5.4-2.7L5 21l2-2 6.9-4.5L12 7.25l-3.4 5.5.8 2.8-5.2-2.6L3 13l6.8 5.4.3-2.2zM9.4 5.3a1 1 0 0 0 0 1.4l1.6 3L12 11l.9 2.3 5.3-2.6a1 1 0 0 0 0-1.4l-1.6-3L12 5l-.9-2.3-5.3 2.6z" />
          </svg>
          {property.bathrooms > 1 ? property.bathrooms : ''} Ba
        </div>
      </div>
    </div>
  )
}

export default PropertyCard
export { PropertyCard }