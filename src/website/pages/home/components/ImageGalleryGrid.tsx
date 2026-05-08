
const galleryColumns = [
  [
    '/room-standard.jpg',
    '/executive-enhanced.webp',
    '/room-deluxe.jpg',
    '/corridor-enhanced.webp',
    '/Car_parking_left_storey_building_0831b9e5ad.webp',
    '/gallery-livingarea.jpg'
  ],
  [
    '/room-executive.jpg',
    '/deluxe-enhanced.webp',
    '/stand1-enhanced.webp',
    '/hotelview-enhanced.webp',
    '/Please_make_the_ceiling_perfectly_smooth_54295b0e58.webp',
    '/gallery-bedroom.jpg'
  ],
  [
    '/standard-enhanced.webp',
    '/exec1-enhanced.webp',
    '/exec2-enhanced.webp',
    '/livingarearecep-enhanced.webp',
    '/gallery-rooms-bathroom.jpg'
  ]
];

export default function ImageGalleryGrid() {
  return (
    <section className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {galleryColumns.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-4">
              {column.map((image, imgIndex) => (
                <div
                  key={imgIndex}
                  className="relative overflow-hidden rounded-lg shadow-lg group cursor-pointer border border-resort-green-100"
                >
                  <img
                    src={image}
                    alt={`Gallery image ${colIndex}-${imgIndex}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-32 sm:h-52 md:h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-resort-green-900/0 group-hover:bg-resort-green-900/20 transition-all duration-300"></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
