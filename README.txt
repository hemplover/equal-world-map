EQUAL WORLD MAP: 195 COUNTRIES THAT EACH MAKE THE SAME MONEY
From the Nils Explains video "I Redrew the World So Every Country Makes the Same Money"
Video: <VIDEO LINK>

FILES
- equal-world-195-countries.geojson.zip   The full database (195 features, full-detail geometry, as used for the
                                          video's maps). Inside: the GeoJSON, this README, LICENSE.txt and
                                          sources-by-country.csv.
- equal-world-195-countries-small.geojson A SIMPLIFIED copy for quick viewing (about 2.8 MB): same 195 features and
                                          same fields, lines simplified (about 4-5 km tolerance, finer around the
                                          small city regions), coordinates rounded to 3 decimals. Tiny slivers and
                                          gaps (a few km2) can appear along shared lines. Use the zip for any work.
- README.txt, LICENSE.txt                 This file and the licence statement.
- sources-by-country.csv                  Source and licence of the district lines, per today's country.
Coordinates: longitude/latitude, WGS 84 (EPSG:4326).

WHAT ONE FEATURE IS
One new "country": a single connected piece of the world (plus the islands that join it across the sea) that makes
about 1/195 of world GDP in 2024. It is a union of real district polygons; it does not follow today's borders unless
the money happens to.

FIELDS
id                   0-194
name                 working name, mostly the largest city inside (see name_from)
name_from            how the name was chosen: "capital city" (largest city), "today's country" (the region is 90%+ of
                     one country and 90%+ of that country is in it), or a province / state name
capital              largest city inside the region (Natural Earth populated places)
cap_lat, cap_lon     its position, degrees
cap_pop              its population (Natural Earth estimate)
cap_country          ISO 3-letter code of the country the capital is in today
gdp                  GDP of the region, US$ 2024 current prices (nominal), see gdp_unit
people               people living in the region (estimate, from the same gridded data)
area_km2             land area, km2
countries            today's countries inside, largest by GDP first (at most 6; those over 0.5% of the GDP or 5% of
                     the area): name, gdp_share, area_share, people_share (shares of THIS region, 0-1)
main_country         the today's country with the largest GDP share
main_share           its share of the region's GDP (0-1)
main_country_whole   the share of that country's whole GDP that lies in this region (0-1)
official_gdp_used    true if official local GDP figures make up more than 1% of the region's GDP
official_gdp_share   the share of the region's GDP that comes from official local figures (0-1)
grid_only_split      true if a district inside was cut on a ~9 km grid (those inner lines are not data)
payroll_proxy_split  true if a US county inside was cut by payroll (ZIP areas or the Manhattan line)
tint                 colour class (0-3) so that no two touching regions share a class (map colouring only)
elongation           length / width by principal axes (shape check)
gdp_unit             "US$ 2024 (current)"
sharealike_sources   share-alike licences among the district lines inside this region ("ODbL 1.0",
                     "CC BY-SA 2.0", "CC BY-SA 3.0"); empty = only public-domain or attribution-only sources.
                     Added for this release: from the countries list plus an overlap test with Natural Earth country
                     outlines, best effort.

METHOD (short)
1. Building blocks: 55,811 district polygons: geoBoundaries gbOpen (ADM2 for most countries, ADM3 for Germany and
   Italy, ADM1 where there is no ADM2), US Census cartographic counties 2023 for the US, Natural Earth for Oman, Hong
   Kong and small territories. Coasts and national lines: Natural Earth 10m.
2. Money per district: the Kummu et al. gridded GDP for 2024 (5 arc-min) shared out to the districts, each country
   rescaled to its IMF World Economic Outlook 2024 nominal GDP. People: the same sharing.
3. Official local GDP replaces the grid where we had it (BEA for US counties, Tokyo, Paris, Hauts-de-Seine, Inner
   London, Seoul, Shanghai, Beijing, Shenzhen, Munich, Zurich, Dublin), the rest of each country rescaled to keep its
   IMF total.
4. Districts worth more than about 0.9 of a share are split inside: big US counties into ZIP areas by payroll;
   Manhattan along a street by payroll (the line runs along 45th Street); a few others on the grid.
5. Target: world GDP / 195 = US$ 575.2 bn per region. Regions grow from 195 seeds over land, then a balancing pass
   moves districts between neighbours until each region is close to one share; then smoothing and a shape check.
6. A sea is crossed only where a land group does not hold a whole number of shares (e.g. Dover, the Tasman, Taiwan
   Strait); small islands join the region across their shortest crossing.
7. Each region is one connected piece (counting those forced crossings); 5 colour classes are assigned at the end.

KNOWN LIMITS
- Equal within limits: the regions range from 0.94 to 1.04 of a share; 191 of 195 are within +-5%. The four outside
  are Australia's (each about -5.8%): Australia, New Zealand and New Guinea hold 3.77 shares together.
- Manhattan's line is a payroll proxy (US Census ZIP Code Business Patterns and LEHD LODES jobs), not GDP. By other
  readings it falls between 38th and 45th Street.
- People are estimates from gridded data. The "New York" region's 0.3 million is far too low (coarse grid): do not
  use its GDP per head.
- Official local GDP figures are not all spot-checked; Chinese cities are coarse (one unit per city core).
- Inner lines flagged grid_only_split are straight grid cuts, not real boundaries.
- Shared edges are exact inside each country; along national lines there is float noise (a few hectares of overlap
  and small pin-holes where two sources meet). Two features (Newark, Boston) have nested rings that some tools call
  invalid; a standard "make valid" fixes them with no change in area. They are left as built.
- Names are working names, not proposals.

SOURCES AND LICENCES
District lines come from geoBoundaries gbOpen, which passes on each country's own source licence. Per group:

1. Open Database License 1.0 (ODbL), 39 countries: Bahamas, Bahrain, Baikonur, Chile, Cuba, Estonia, Finland,
   Guinea-Bissau, Haiti, Hungary, Iran, Kazakhstan, Kiribati, Kuwait, Lithuania, Monaco, Montenegro, Morocco,
   Nicaragua, Russia, Serbia, Slovakia, Slovenia, Sri Lanka, Tajikistan, Trinidad and Tobago, United Arab Emirates,
   eSwatini (OpenStreetMap, Wambacher); Luxembourg (OpenStreetMap); Mauritius, Poland, Sao Tome and Principe
   (geoBoundaries, OpenStreetMap); Turkey (OpenStreetMap, OSM Boundaries); Belgium (Statistics Belgium); Ethiopia (Open
   Africa, Code for Ethiopia); India (Pathways Data Pvt. Ltd., lgdirectory.gov.in); Jamaica (Justin Meyers, Planning
   Office of Jamaica); Venezuela (Efrain Porto Tapiquen Geografia, SIG y Estudios Ambientales).
   Attribution: Contains information from OpenStreetMap contributors and the sources named, via geoBoundaries,
   available under the ODbL 1.0. (c) OpenStreetMap contributors, https://www.openstreetmap.org/copyright

2. Creative Commons Attribution-ShareAlike 2.0 (CC BY-SA 2.0), 7 countries: Japan, Taiwan, Kosovo, Togo
   (OpenStreetMap, Wambacher); Saudi Arabia (geoBoundaries, OpenStreetMap); Croatia (OpenStreetMap, geoBoundaries);
   Austria (Federal Office for Metrology and Survey, Austria).
   Attribution: district lines of these countries from the sources named, via geoBoundaries, CC BY-SA 2.0,
   https://creativecommons.org/licenses/by-sa/2.0/ ; adapted (merged into the new regions).

3. Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0), 6 countries: Azerbaijan (Wikipedia); Cyprus
   and Northern Cyprus (Wikipedia, Cyprus Department of Land Registry and Geometry); Kyrgyzstan (Wikipedia, Districts
   of Kyrgyzstan); Turkmenistan (CIESIN); Uruguay (Wikimedia Commons).
   Attribution: district lines of these countries from the sources named, via geoBoundaries, CC BY-SA 3.0,
   https://creativecommons.org/licenses/by-sa/3.0/ ; adapted (merged into the new regions).

4. Attribution only (CC BY 2.5 / 3.0 / 3.0 IGO / 4.0 and government open licences: Open Government Licence v3.0 UK,
   Etalab 2.0 France, Data licence Germany 2.0, Open Government Canada 2.0, Singapore Open Data Licence 1.0,
   swisstopo, INE Spain, PDDL China), about 100 countries, among them Australia, Brazil, Canada, France, Germany,
   Indonesia, Italy, Mexico, Nigeria, South Korea, Spain, Switzerland, the United Kingdom.
   Attribution: geoBoundaries (Runfola et al. 2020, https://www.geoboundaries.org) and each country's source as listed
   in the geoBoundaries metadata.

5. Public domain / CC0: US Census Bureau (cartographic counties 2023, ZCTA 2020, TIGER 2023 water and roads, ZIP
   Code Business Patterns 2023, LEHD LODES 2022): the US and its territories; Natural Earth (coasts, national lines,
   populated places; Oman, Hong Kong and about 60 small territories); about 30 countries from public-domain or CC0
   geoBoundaries sources (Afghanistan, Algeria, Ukraine, Pakistan, Netherlands, Sweden, Israel...).

6. Data inside the regions: Kummu et al. 2025, gridded GDP and population, CC BY 4.0,
   https://doi.org/10.5281/zenodo.18429133 ; IMF World Economic Outlook 2024 (national totals); official local GDP
   from BEA (US), Tokyo Metropolitan Government, Eurostat / INSEE (Paris, Hauts-de-Seine), ONS (Inner London), CSO
   Ireland, Statistik Stadt Zurich, Bayerisches Landesamt fur Statistik, Seoul, Shanghai and Beijing statistics.

Per country (level used, licence, source, year): sources-by-country.csv, from the geoBoundaries metadata.

LICENCE OF THIS DATABASE
The database is offered under the Open Database License 1.0 (ODbL), https://opendatacommons.org/licenses/odbl/1-0/ ,
because it is derived from ODbL data. Regions marked "CC BY-SA 2.0" or "CC BY-SA 3.0" in sharealike_sources also
contain lines adapted from CC BY-SA sources; for those parts the CC BY-SA terms (credit, same licence) apply as well.
Twelve regions contain both (Lagos, Tel Aviv, Ar Riyad, Dammam, Athens, Ankara, Baghdad, Tehran, Vienna, Budapest,
Kabul, Urumqi). Full statement: LICENSE.txt. We are not lawyers; this is our good-faith reading of the licences, not
legal advice. If you are a rights holder and see a problem, tell us through the video's comments.
