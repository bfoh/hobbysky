
export default function PoliciesSection() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-gray-200 pt-10">
          <h3 className="text-xl font-bold text-resort-green-900 mb-6">
            Check-In and Check-Out Policies
          </h3>

          <div className="space-y-2 text-sm text-resort-green-800">
            <div className="flex items-center gap-2">
              <span className="text-resort-green-600">&bull;</span>
              <span>
                <strong>Check-in:</strong> 3:00 PM
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-resort-green-600">&bull;</span>
              <span>
                <strong>Check-out:</strong> 12:00 PM
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
