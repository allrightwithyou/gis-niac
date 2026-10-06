import { CardProps } from "@/app/main/components/Card";

export interface Layer {
  id: string;
  label: string;
  active: boolean;
}

export interface Marker {
  id: string;
  label: string;
  color: string;
  count: number;
}

// Расширяем CardProps — добавляем layers и markers
export interface SectionData extends CardProps {
  layers: Layer[];
  markers: Marker[];
}

export const sectionData: SectionData[] = [
  {
    name: "Агропромышленный комплекс",
    shortName: "АПК",
    category: "Сельское хозяйство",
    statistic: "124 объекта",
    img: "/apk.svg",
    link: "/map/apk",
    shadowColor: "#7CB34240",
    layers: [
      { id: "apk_fields", label: "Сельхозугодья", active: true },
      { id: "apk_farms", label: "Фермерские хозяйства", active: true },
      { id: "apk_greenhouses", label: "Теплицы", active: false },
    ],
    markers: [
      { id: "apk_farm", label: "Фермы", color: "#7CB342", count: 43 },
      { id: "apk_storage", label: "Хранилища", color: "#558B2F", count: 18 },
    ],
  },
  {
    name: "Ресурсы",
    shortName: "Ресурсы",
    category: "Природные ресурсы",
    statistic: "89 слоёв",
    img: "/resources.svg",
    link: "/map/resources",
    shadowColor: "#8D6E6340",
    layers: [
      { id: "res_mineral", label: "Месторождения", active: true },
      { id: "res_water", label: "Водные ресурсы", active: true },
      { id: "res_forest", label: "Лесной фонд", active: false },
    ],
    markers: [
      { id: "res_deposit", label: "Месторождения", color: "#8D6E63", count: 27 },
      { id: "res_well", label: "Скважины", color: "#6D4C41", count: 15 },
    ],
  },
  {
    name: "Образование и спорт",
    shortName: "Соц",
    category: "Инфраструктура",
    statistic: "312 учреждений",
    img: "/social.svg",
    link: "/map/social",
    shadowColor: "#42A5F540",
    layers: [
      { id: "soc_schools", label: "Школы", active: true },
      { id: "soc_kinder", label: "Детсады", active: true },
      { id: "soc_sport", label: "Спортобъекты", active: false },
    ],
    markers: [
      { id: "soc_school", label: "Школы", color: "#42A5F5", count: 112 },
      { id: "soc_kinder", label: "Детсады", color: "#1E88E5", count: 87 },
      { id: "soc_stadium", label: "Стадионы", color: "#1565C0", count: 23 },
    ],
  },
  {
    name: "Экология",
    shortName: "Эко",
    category: "Мониторинг среды",
    statistic: "47 постов",
    img: "/eco.svg",
    link: "/map/eco",
    shadowColor: "#26A69A40",
    layers: [
      { id: "eco_stations", label: "Посты мониторинга", active: true },
      { id: "eco_zones", label: "ООПТ", active: true },
      { id: "eco_pollution", label: "Зоны загрязнения", active: false },
    ],
    markers: [
      { id: "eco_post", label: "Посты мониторинга", color: "#26A69A", count: 47 },
      { id: "eco_reserve", label: "Заповедники", color: "#00897B", count: 12 },
    ],
  },
  {
    name: "Реестр жилищного фонда",
    shortName: "ЖКХ",
    category: "Непригодное жильё",
    statistic: "1 284 объекта",
    img: "/zhkh.svg",
    link: "/map/zhkh",
    shadowColor: "#78909C40",
    layers: [
      { id: "zhkh_houses", label: "Жилые дома", active: true },
      { id: "zhkh_unfit", label: "Непригодное жильё", active: true },
      { id: "zhkh_emergency", label: "Аварийные объекты", active: false },
    ],
    markers: [
      { id: "zhkh_house", label: "Многоквартирные дома", color: "#78909C", count: 684 },
      { id: "zhkh_emergency", label: "Аварийные", color: "#B0BEC5", count: 600 },
    ],
  },
  {
    name: "Культура",
    shortName: "Культура",
    category: "Культура и туризм",
    statistic: "76 объектов",
    img: "/culture.svg",
    link: "/map/culture",
    shadowColor: "#AB47BC40",
    layers: [
      { id: "cul_objects", label: "Объекты культуры", active: true },
      { id: "cul_monuments", label: "Памятники", active: true },
      { id: "cul_tourism", label: "Турмаршруты", active: false },
    ],
    markers: [
      { id: "cul_museum", label: "Музеи", color: "#AB47BC", count: 14 },
      { id: "cul_monument", label: "Памятники", color: "#8E24AA", count: 41 },
      { id: "cul_theater", label: "Театры", color: "#6A1B9A", count: 21 },
    ],
  },
  {
    name: "Гектар в Арктике",
    shortName: "Арктика",
    category: "Земельные участки",
    statistic: "2 388 участков",
    img: "/arctica.svg",
    link: "/map/arctica",
    shadowColor: "#4DD0E140",
    layers: [
      { id: "arc_plots", label: "Земельные участки", active: true },
      { id: "arc_settlements", label: "Поселения", active: true },
      { id: "arc_infra", label: "Инфраструктура", active: false },
    ],
    markers: [
      { id: "arc_plot", label: "Участки", color: "#4DD0E1", count: 2388 },
      { id: "arc_settlement", label: "Посёлки", color: "#00ACC1", count: 34 },
    ],
  },
  {
    name: "Данные ДЗЗ",
    shortName: "ДЗЗ",
    category: "Дистанционное зондирование",
    statistic: "5.2 ТБ данных",
    img: "/dzz.svg",
    link: "/map/dzz",
    shadowColor: "#5C6BC040",
    layers: [
      { id: "dzz_optical", label: "Оптическая съёмка", active: true },
      { id: "dzz_radar", label: "Радарная съёмка", active: true },
      { id: "dzz_thermal", label: "Тепловая съёмка", active: false },
    ],
    markers: [
      { id: "dzz_scene", label: "Сцены съёмки", color: "#5C6BC0", count: 3420 },
      { id: "dzz_satellite", label: "Спутники", color: "#3949AB", count: 8 },
    ],
  },
  {
    name: "Информатизация и связь",
    shortName: "ИТ",
    category: "Цифровая инфраструктура",
    statistic: "18 узлов",
    img: "/it.svg",
    link: "/map/it",
    shadowColor: "#29B6F640",
    layers: [
      { id: "it_towers", label: "Вышки связи", active: true },
      { id: "it_centers", label: "ЦОД", active: true },
      { id: "it_coverage", label: "Зоны покрытия", active: false },
    ],
    markers: [
      { id: "it_tower", label: "Вышки связи", color: "#29B6F6", count: 12 },
      { id: "it_datacenter", label: "ЦОД", color: "#0288D1", count: 6 },
    ],
  },
  {
    name: "Здравоохранение",
    shortName: "Мед",
    category: "Медицинские объекты",
    statistic: "63 учреждения",
    img: "/med.svg",
    link: "/map/med",
    shadowColor: "#EF535040",
    layers: [
      { id: "med_hospitals", label: "Больницы", active: true },
      { id: "med_clinics", label: "Поликлиники", active: true },
      { id: "med_ambulance", label: "Фельдшерские пункты", active: false },
    ],
    markers: [
      { id: "med_hospital", label: "Больницы", color: "#EF5350", count: 28 },
      { id: "med_clinic", label: "Поликлиники", color: "#E53935", count: 35 },
    ],
  },
  {
    name: "Инвестиции",
    shortName: "Бизнес",
    category: "Инвестиционные площадки",
    statistic: "34 площадки",
    img: "/business.svg",
    link: "/map/business",
    shadowColor: "#FFA72640",
    layers: [
      { id: "biz_sites", label: "Инвестплощадки", active: true },
      { id: "biz_zones", label: "Особые зоны", active: true },
      { id: "biz_industrial", label: "Индустриальные парки", active: false },
    ],
    markers: [
      { id: "biz_site", label: "Инвестплощадки", color: "#FFA726", count: 34 },
      { id: "biz_zone", label: "ОЭЗ", color: "#FB8C00", count: 5 },
    ],
  },
  {
    name: "Гражданская защита",
    shortName: "ЧС",
    category: "ЧС и безопасность",
    statistic: "28 служб",
    img: "/chs.svg",
    link: "/map/chs",
    shadowColor: "#D4E15740",
    layers: [
      { id: "chs_services", label: "Службы ЧС", active: true },
      { id: "chs_shelters", label: "Укрытия", active: true },
      { id: "chs_routes", label: "Маршруты эвакуации", active: false },
    ],
    markers: [
      { id: "chs_station", label: "Пожарные части", color: "#D4E157", count: 18 },
      { id: "chs_shelter", label: "Укрытия", color: "#C0CA33", count: 10 },
    ],
  },
];

