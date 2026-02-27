
const galleryColumns = [
  [
    '/room-standard.jpg',
    '/executive-enhanced.jpeg',
    '/room-deluxe.jpg',
    '/corridor-enhanced.png',
    '/Car_parking_left_storey_building_0831b9e5ad.jpeg',
    '/gallery-livingarea.jpg'
  ],
  [
    '/room-executive.jpg',
    '/deluxe-enhanced.jpeg',
    '/stand1-enhanced.jpeg',
    '/hotelview-enhanced.png',
    '/Please_make_the_ceiling_perfectly_smooth_54295b0e58.jpeg',
    '/gallery-bedroom.jpg'
  ],
  [
    '/standard-enhanced.jpeg',
    '/exec1-enhanced.jpeg',
    '/exec2-enhanced.jpeg',
    '/livingarearecep-enhanced.jpeg',
    '/gallery-rooms-bathroom.jpg'
  ]
];

export default function ImageGalleryGrid() {
  return (
    <section className="py-20 px-4 bg-white hidden md:block">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
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
                    className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
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
