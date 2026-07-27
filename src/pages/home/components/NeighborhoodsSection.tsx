import { Link } from 'react-router-dom';

export default function NeighborhoodsSection() {
  return (
    <section id="neighborhoods" className="relative bg-white">
      <div className="text-center pt-10 md:pt-16 pb-6 md:pb-8 px-4 md:px-6 lg:px-10">
        <h2 className="font-roboto font-bold text-2xl md:text-3xl text-primary">
          Nairobi Prime Neighbourhoods
        </h2>
        <p className="text-golden text-xs sm:text-sm md:text-base font-roboto font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] md:tracking-[0.2em] mt-2 md:mt-3">
          Premium Homes. Select Locations. Expat Representation.
        </p>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-4 gap-0.5 auto-rows-[260px] lg:auto-rows-[300px] xl:auto-rows-[340px] px-4 md:px-8 lg:px-12 xl:px-16">
        {/* Karen - col-span-2 */}
        <Link
          to="/neighbourhood/karen"
          className="relative overflow-hidden block group cursor-pointer col-span-2"
        >
          <img
            alt="Karen"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/2937cb91-6e1e-4eef-a995-39071683b32d_karen-gables-nairobi-pic-1.jpg?v=7fb2f933859005c2e8ed2d2020fa6eb8"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Karen
            </h3>
          </div>
        </Link>

        {/* Westlands */}
        <Link
          to="/neighbourhood/westlands"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Westlands"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/80654c03-86fa-4eb2-bc42-7d6b94688b6b_5016c457-f096-4879-8937-a60638aac297.jpg?v=b6390de7072f72bc8a6e882979d84f47"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Westlands
            </h3>
          </div>
        </Link>

        {/* Kilimani */}
        <Link
          to="/neighbourhood/kilimani"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Kilimani"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/07e717a3-a84c-4c91-a21e-e2130a3850ac_KILIMANI.jpg?v=db8ab8e12a29a33dea0a88ec72d0fe3e"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Kilimani
            </h3>
          </div>
        </Link>

        {/* Lavington */}
        <Link
          to="/neighbourhood/lavington"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Lavington"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/190f32dc-cab6-4b31-b8a1-b2689f6d6385_caption.jpg?v=034c49ac1815c10bc5a7fb005d1c5fff"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Lavington
            </h3>
          </div>
        </Link>

        {/* Runda */}
        <Link
          to="/neighbourhood/runda"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Runda"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/f6303c35-6fde-4bcc-9713-32d21488683e_runda.jpg?v=40db2a1115a6f49bfcd9562d131d6412"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Runda
            </h3>
          </div>
        </Link>

        {/* Muthaiga - col-span-2 */}
        <Link
          to="/neighbourhood/muthaiga"
          className="relative overflow-hidden block group cursor-pointer col-span-2"
        >
          <img
            alt="Muthaiga"
            className="w-full h-full object-cover object-bottom transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/ff53cc91-3ee9-4eb3-83e8-97ec8057ffc9_muthaiga.jpg?v=95f103e2857abd04a1900fe7833cf0e5"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Muthaiga
            </h3>
          </div>
        </Link>

        {/* Gigiri - col-span-2 */}
        <Link
          to="/neighbourhood/gigiri"
          className="relative overflow-hidden block group cursor-pointer col-span-2"
        >
          <img
            alt="Gigiri"
            className="w-full h-full object-cover object-bottom transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/db08325b-8ce9-4c36-8d41-656e9e2babc7_unheads.jpg?v=43855391f7a003bdc14ea1949714b18e"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Gigiri
            </h3>
          </div>
        </Link>

        {/* Kileleshwa */}
        <Link
          to="/neighbourhood/kileleshwa"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Kileleshwa"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/016c219e-f565-43a7-8536-fd525f3ce5a4_Marquis-1.jpeg?v=3588a0ed11e75032855fe5ef4c68f43f"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Kileleshwa
            </h3>
          </div>
        </Link>

        {/* Langata */}
        <Link
          to="/neighbourhood/langata"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Langata"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/6de2ea12-18c3-4a20-a5c5-5e1c77558704_kitsuru.jpg?v=1f8fb20c35fb32bdbe92812e2f7f26a5"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Langata
            </h3>
          </div>
        </Link>
      </div>

      {/* Mobile grid */}
      <div className="grid md:hidden grid-cols-2 gap-2 auto-rows-[200px] sm:auto-rows-[220px] px-3 sm:px-4">
        <Link
          to="/neighbourhood/karen"
          className="relative overflow-hidden block group cursor-pointer col-span-2"
        >
          <img
            alt="Karen"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/2937cb91-6e1e-4eef-a995-39071683b32d_karen-gables-nairobi-pic-1.jpg?v=7fb2f933859005c2e8ed2d2020fa6eb8"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Karen
            </h3>
          </div>
        </Link>

        <Link
          to="/neighbourhood/westlands"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Westlands"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/80654c03-86fa-4eb2-bc42-7d6b94688b6b_5016c457-f096-4879-8937-a60638aac297.jpg?v=b6390de7072f72bc8a6e882979d84f47"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Westlands
            </h3>
          </div>
        </Link>

        <Link
          to="/neighbourhood/kilimani"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Kilimani"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/07e717a3-a84c-4c91-a21e-e2130a3850ac_KILIMANI.jpg?v=db8ab8e12a29a33dea0a88ec72d0fe3e"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Kilimani
            </h3>
          </div>
        </Link>

        <Link
          to="/neighbourhood/lavington"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Lavington"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/190f32dc-cab6-4b31-b8a1-b2689f6d6385_caption.jpg?v=034c49ac1815c10bc5a7fb005d1c5fff"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Lavington
            </h3>
          </div>
        </Link>

        <Link
          to="/neighbourhood/runda"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Runda"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/f6303c35-6fde-4bcc-9713-32d21488683e_runda.jpg?v=40db2a1115a6f49bfcd9562d131d6412"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Runda
            </h3>
          </div>
        </Link>

        <Link
          to="/neighbourhood/muthaiga"
          className="relative overflow-hidden block group cursor-pointer col-span-2"
        >
          <img
            alt="Muthaiga"
            className="w-full h-full object-cover object-bottom transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/ff53cc91-3ee9-4eb3-83e8-97ec8057ffc9_muthaiga.jpg?v=95f103e2857abd04a1900fe7833cf0e5"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Muthaiga
            </h3>
          </div>
        </Link>

        <Link
          to="/neighbourhood/gigiri"
          className="relative overflow-hidden block group cursor-pointer col-span-2"
        >
          <img
            alt="Gigiri"
            className="w-full h-full object-cover object-bottom transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/db08325b-8ce9-4c36-8d41-656e9e2babc7_unheads.jpg?v=43855391f7a003bdc14ea1949714b18e"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Gigiri
            </h3>
          </div>
        </Link>

        <Link
          to="/neighbourhood/kileleshwa"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Kileleshwa"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/016c219e-f565-43a7-8536-fd525f3ce5a4_Marquis-1.jpeg?v=3588a0ed11e75032855fe5ef4c68f43f"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Kileleshwa
            </h3>
          </div>
        </Link>

        <Link
          to="/neighbourhood/langata"
          className="relative overflow-hidden block group cursor-pointer col-span-1"
        >
          <img
            alt="Langata"
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            src="https://storage.readdy-site.link/project_files/842d3b8a-5d73-416c-bead-c20132299a10/6de2ea12-18c3-4a20-a5c5-5e1c77558704_kitsuru.jpg?v=1f8fb20c35fb32bdbe92812e2f7f26a5"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[0.58] to-black/[0.12] group-hover:from-black/[0.68] group-hover:to-black/[0.22] transition-all duration-500"></div>
          <div className="absolute bottom-4 left-4 md:bottom-[22px] md:left-[22px]">
            <h3 className="font-roboto font-bold text-white text-base md:text-lg lg:text-xl font-medium leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
              Langata
            </h3>
          </div>
        </Link>
      </div>

      <div className="flex justify-center pt-7 pb-10 md:pt-10 md:pb-16 px-4 md:px-6 lg:px-10">
        <Link
          to="/neighbourhoods"
          className="inline-flex items-center gap-2.5 px-7 py-3 border border-stone-300 text-sm font-roboto font-medium text-stone-700 hover:border-stone-800 hover:text-stone-900 hover:bg-[#f5f5f5] transition-all duration-200 whitespace-nowrap group cursor-pointer"
        >
          View More Neighbourhoods
          <span className="w-5 h-5 flex items-center justify-center bg-stone-100 group-hover:bg-stone-200 transition-colors">
            <i className="ri-arrow-right-line text-xs"></i>
          </span>
        </Link>
      </div>
    </section>
  );
}