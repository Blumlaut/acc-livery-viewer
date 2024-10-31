var skinMaterialIds = {
    "glossy": 0,
    "matte": 1,
    "satin": 2,
    "satinMetallic": 3,
    "metallic": 4,
    "chrome": 5
}

var paintMaterials = {
    "glossy": {
        "baseRoughness": 0,
        "clearCoat": 1,
        "clearCoatRoughness": 0.0,
        "metallic": 0.1
    },
    "metallic": {
        "baseRoughness": 0.1,
        "clearCoat": 1,
        "clearCoatRoughness": 0.5,
        "metallic": 0.25
    },
    "satinMetallic": {
        "baseRoughness": 0.3,
        "clearCoat": 0.5,
        "clearCoatRoughness": 0.3,
        "metallic": 0.7
    },
    "satin": {
        "baseRoughness": 0.25,
        "clearCoat": 0.1,
        "clearCoatRoughness": 0.3,
        "metallic": 0.3
    },
    "matte": {
        "baseRoughness": 0.15,
        "clearCoat": 0.6,
        "clearCoatRoughness": 0.6,
        "metallic": 0
    },
    "chrome": {
        "baseRoughness": 0.2,
        "clearCoat": 0,
        "clearCoatRoughness": 0,
        "metallic": 0.9
    }
}

const modelFiles = {
    "alpine_a110_gt4": "alpine_a110_gt4_exterior",
    "amr_v12_vantage_gt3": "amr_v12_vantage_gt3_exterior_sprint",
    "amr_v8_vantage_gt3": "amr_v8_vantage_gt3_exterior",
    "amr_v8_vantage_gt4": "amr_v8_vantage_gt4_exterior",
    "audi_r8_gt4": "audi_r8_gt4_exterior",
    "audi_r8_lms": "audi_r8_lms_exterior_sprint",
    "audi_r8_lms_evo": "audi_r8_lms_evo_exterior_sprint",
    "audi_r8_lms_evo_ii": "audi_r8_lms_evo_ii_exterior_sprint",
    "audi_r8_lms_gt2": "audi_r8_lms_gt2_exterior",
    "bentley_continental_gt3_2016": "bentley_continental_gt3_2016_exterior",
    "bentley_continental_gt3_2018": "bentley_continental_gt3_2018_exterior",
    "bmw_m2_cs_racing": "bmw_m2_cs_racing_exterior",
    "bmw_m4_gt3": "bmw_m4_gt3_exterior",
    "bmw_m4_gt4": "bmw_m4_gt4_exterior",
    "bmw_m6_gt3": "bmw_m6_gt3_exterior_sprint",
    "chevrolet_camaro_gt4r": "chevrolet_camaro_gt4r_exterior",
    "ferrari_296_gt3": "ferrari_296_gt3_exterior",
    "ferrari_488_challenge_evo": "ferrari_488_challenge_evo_exterior",
    "ferrari_488_gt3": "ferrari_488_gt3_exterior_sprint",
    "ferrari_488_gt3_evo": "ferrari_488_gt3_evo_exterior_sprint",
    "ford_mustang_gt3": "ford_mustang_gt3_exterior",
    "ginetta_g55_gt4": "ginetta_g55_gt4_exterior",
    "honda_nsx_gt3": "honda_nsx_gt3_exterior",
    "honda_nsx_gt3_evo": "honda_nsx_gt3_evo_exterior",
    "jaguar_g3": "jaguar_g3_exterior",
    "ktm_xbow_gt2": "ktm_xbow_gt2_exterior",
    "ktm_xbow_gt4": "ktm_xbow_gt4_exterior",
    "lamborghini_gallardo_rex": "lamborghini_gallardo_rex_exterior",
    "lamborghini_huracan_gt3": "lamborghini_huracan_gt3_exterior_sprint",
    "lamborghini_huracan_gt3_evo": "lamborghini_huracan_gt3_evo_exterior_sprint",
    "lamborghini_huracan_gt3_evo2": "lamborghini_huracan_gt3_2023_exterior_sprint",
    "lamborghini_huracan_st": "lamborghini_huracan_st_exterior",
    "lamborghini_huracan_st_evo2": "lamborghini_huracan_st_evo2_exterior",
    "lexus_rc_f_gt3": "lexus_rcf_gt3_exterior_sprint",
    "maserati_mc20_gt2": "maserati_mc20_gt2_exterior",
    "maserati_mc_gt4": "maserati_mc_gt4_exterior",
    "mclaren_570s_gt4": "mclaren_570s_gt4_exterior",
    "mclaren_650s_gt3": "mclaren_650s_gt3_exterior_sprint",
    "mclaren_720s_gt3": "mclaren_720s_gt3_exterior",
    "mclaren_720s_gt3_evo": "mclaren_720s_gt3_evo_exterior",
    "mercedes_amg_gt2": "mercedes_amg_gt2_exterior",
    "mercedes_amg_gt3": "mercedes_amg_gt3_exterior_sprint",
    "mercedes_amg_gt3_evo": "mercedes_amg_gt3_evo_exterior_sprint",
    "mercedes_amg_gt4": "mercedes_amg_gt4_exterior",
    "nissan_gt_r_gt3_2017": "nissan_gtr_gt3_2017_exterior",
    "nissan_gt_r_gt3_2018": "nissan_gtr_gt3_2018_exterior",
    "porsche_718_cayman_gt4_mr": "porsche_718_cayman_gt4_mr_exterior",
    "porsche_935": "porsche_935_exterior",
    "porsche_991_gt3_r": "porsche_991_gt3_r_exterior_sprint",
    "porsche_991ii_gt2_rs_cs_evo": "porsche_991ii_gt2_rs_cs_evo_exterior",
    "porsche_991ii_gt3_cup": "porsche_991ii_gt3_cup_exterior",
    "porsche_991ii_gt3_r": "porsche_991ii_gt3_r_exterior",
    "porsche_992_gt3_cup": "porsche_992_gt3_cup_exterior",
    "porsche_992_gt3_r": "porsche_992_gt3_r_exterior",
};

const cubemaps = [
    "overcast",
    "sunny",
    "sunset",
    "night",
]

const baseLiveries = {
    "alpine_a110_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "amr_v12_vantage_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "amr_v8_vantage_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "amr_v8_vantage_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "audi_r8_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "audi_r8_lms": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "audi_r8_lms_evo": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        },
        "110": {
            "path": "custom_11",
            "name": "Skin 11"
        }
    },
    "audi_r8_lms_evo_ii": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        },
        "110": {
            "path": "custom_11",
            "name": "Skin 11"
        }
    },
    "audi_r8_lms_gt2": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "bentley_continental_gt3_2016": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "bentley_continental_gt3_2018": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "bmw_m2_cs_racing": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        }
    },
    "bmw_m4_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "bmw_m4_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "bmw_m6_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "chevrolet_camaro_gt4r": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        }
    },
    "ferrari_296_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "ferrari_488_challenge_evo": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "ferrari_488_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "ferrari_488_gt3_evo": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "ford_mustang_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "ginetta_g55_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "honda_nsx_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        }
    },
    "honda_nsx_gt3_evo": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "jaguar_g3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        }
    },
    "ktm_xbow_gt2": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "ktm_xbow_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "lamborghini_gallardo_rex": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        }
    },
    "lamborghini_huracan_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        }
    },
    "lamborghini_huracan_gt3_evo": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "lamborghini_huracan_gt3_evo2": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        },
        "110": {
            "path": "custom_11",
            "name": "Skin 11"
        }
    },
    "lamborghini_huracan_st": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "lamborghini_huracan_st_evo2": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "lexus_rc_f_gt3": {
        "100": {
            "path": "custom_0",
            "name": "Skin 00",
            "sponsor": true
        },
        "101": {
            "path": "custom_00",
            "name": "Skin 00",
            "sponsor": true
        },
        "102": {
            "path": "custom_000",
            "name": "Skin 000",
            "sponsor": true
        },
        "103": {
            "path": "custom_0000",
            "name": "Skin 0000",
            "sponsor": true
        },
        "194": {
            "path": "custom_1",
            "name": "Skin 01 (CUT)"
        },
        "195": {
            "path": "custom_3",
            "name": "Skin 03 (CUT)"
        }
    },
    "maserati_mc20_gt2": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "maserati_mc_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "mclaren_570s_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02 (CUT)"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03 (CUT)"
        }
    },
    "mclaren_650s_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        }
    },
    "mclaren_720s_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02 (CUT)"
        }
    },
    "mclaren_720s_gt3_evo": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        }
    },
    "mercedes_amg_gt2": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "mercedes_amg_gt3": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "mercedes_amg_gt3_evo": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "mercedes_amg_gt4": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "nissan_gt_r_gt3_2017": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        }
    },
    "nissan_gt_r_gt3_2018": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "porsche_718_cayman_gt4_mr": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "110": {
            "path": "custom_fana",
            "name": "Fana",
            "hasDecals": true,
        }
    },
    "porsche_935": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "porsche_991_gt3_r": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        }
    },
    "porsche_991ii_gt2_rs_cs_evo": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        }
    },
    "porsche_991ii_gt3_cup": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "porsche_991ii_gt3_r": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "102": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        }
    },
    "porsche_992_gt3_cup": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    },
    "porsche_992_gt3_r": {
        "100": {
            "path": "custom_1",
            "name": "Skin 01"
        },
        "101": {
            "path": "custom_2",
            "name": "Skin 02"
        },
        "102": {
            "path": "custom_3",
            "name": "Skin 03"
        },
        "103": {
            "path": "custom_4",
            "name": "Skin 04"
        },
        "104": {
            "path": "custom_5",
            "name": "Skin 05"
        },
        "105": {
            "path": "custom_6",
            "name": "Skin 06"
        },
        "106": {
            "path": "custom_7",
            "name": "Skin 07"
        },
        "107": {
            "path": "custom_8",
            "name": "Skin 08"
        },
        "108": {
            "path": "custom_9",
            "name": "Skin 09"
        },
        "109": {
            "path": "custom_10",
            "name": "Skin 10"
        }
    }
}


const colours = {
    1: {r: 3, g:2, b:2},
    2: {r: 39, g:49, b:54},
    3: {r: 38, g:20, b:15},
    4: {r: 48, g:35, b:39},
    5: {r: 31, g:53, b:57},
    6: {r: 56, g:45, b:45},
    7: {r: 63, g:53, b:54},
    8: {r: 58, g:57, b:55},
    9: {r: 68, g:59, b:60},
    10: {r: 74, g:68, b:68},
    11: {r: 79, g:72, b:73},
    12: {r: 85, g:79, b:80},
    13: {r: 92, g:87, b:87},
    14: {r: 98, g:93, b:93},
    15: {r: 102, g:99, b:98},
    16: {r: 109, g:105, b:104},
    17: {r: 115, g:110, b:109},
    18: {r: 116, g:111, b:110},
    19: {r: 132, g:127, b:125},
    20: {r: 133, g:133, b:131},
    21: {r: 184, g:184, b:182},
    22: {r: 210, g:209, b:208},
    23: {r: 230, g:229, b:227},
    24: {r: 190, g:200, b:206},
    25: {r: 154, g:177, b:201},
    26: {r: 109, g:124, b:142},
    27: {r: 101, g:116, b:132},
    28: {r: 97, g:109, b:127},
    29: {r: 100, g:109, b:127},
    30: {r: 85, g:109, b:127},
    31: {r: 116, g:125, b:163},
    32: {r: 70, g:99, b:162},
    33: {r: 38, g:83, b:127},
    34: {r: 38, g:53, b:85},
    35: {r: 13, g:20, b:83},
    36: {r: 0, g:0, b:129},
    37: {r: 48, g:40, b:127},
    38: {r: 13, g:45, b:127},
    39: {r: 13, g:20, b:142},
    40: {r: 0, g:0, b:162},
    41: {r: 0, g:26, b:196},
    42: {r: 0, g:63, b:196},
    43: {r: 31, g:83, b:201},
    44: {r: 13, g:105, b:201},
    45: {r: 38, g:96, b:223},
    46: {r: 25, g:67, b:253},
    47: {r: 105, g:96, b:237},
    48: {r: 116, g:106, b:255},
    49: {r: 49, g:127, b:201},
    50: {r: 51, g:140, b:195},
    51: {r: 70, g:139, b:201},
    52: {r: 44, g:145, b:201},
    53: {r: 101, g:160, b:201},
    54: {r: 163, g:177, b:201},
    55: {r: 150, g:187, b:201},
    56: {r: 115, g:144, b:208},
    57: {r: 38, g:101, b:237},
    58: {r: 44, g:110, b:255},
    59: {r: 13, g:126, b:237},
    60: {r: 13, g:126, b:237},
    61: {r: 100, g:150, b:238},
    62: {r: 102, g:154, b:255},
    63: {r: 53, g:174, b:237},
    64: {r: 85, g:167, b:237},
    65: {r: 92, g:181, b:255},
    66: {r: 56, g:187, b:255},
    67: {r: 122, g:188, b:237},
    68: {r: 131, g:204, b:251},
    69: {r: 131, g:204, b:255},
    70: {r: 162, g:209, b:237},
    71: {r: 185, g:208, b:237},
    72: {r: 182, g:209, b:237},
    73: {r: 196, g:224, b:255},
    74: {r: 200, g:223, b:255},
    75: {r: 177, g:221, b:237},
    76: {r: 175, g:224, b:255},
    77: {r: 191, g:238, b:255},
    78: {r: 209, g:237, b:237},
    79: {r: 225, g:255, b:255},
    80: {r: 236, g:245, b:251},
    81: {r: 241, g:249, b:255},
    82: {r: 241, g:255, b:255},
    83: {r: 206, g:255, b:255},
    84: {r: 148, g:255, b:233},
    85: {r: 156, g:255, b:255},
    86: {r: 128, g:255, b:213},
    87: {r: 0, g:255, b:255},
    88: {r: 126, g:254, b:255},
    89: {r: 86, g:255, b:255},
    90: {r: 143, g:236, b:237},
    91: {r: 79, g:236, b:237},
    92: {r: 77, g:227, b:237},
    93: {r: 130, g:217, b:209},
    94: {r: 147, g:201, b:201},
    95: {r: 120, g:193, b:201},
    96: {r: 121, g:201, b:201},
    97: {r: 70, g:206, b:207},
    98: {r: 65, g:200, b:220},
    99: {r: 68, g:201, b:201},
    100: {r: 124, g:206, b:183},
    101: {r: 65, g:193, b:201},
    102: {r: 59, g:171, b:161},
    103: {r: 56, g:158, b:158},
    104: {r: 65, g:142, b:129},
    105: {r: 48, g:136, b:130},
    106: {r: 44, g:126, b:127},
    107: {r: 94, g:126, b:127},
    108: {r: 74, g:121, b:127},
    109: {r: 0, g:129, b:129},
    110: {r: 77, g:138, b:118},
    111: {r: 121, g:135, b:107},
    112: {r: 133, g:140, b:122},
    113: {r: 97, g:125, b:87},
    114: {r: 115, g:141, b:0},
    115: {r: 102, g:125, b:33},
    116: {r: 31, g:63, b:15},
    117: {r: 44, g:103, b:83},
    118: {r: 48, g:115, b:49},
    119: {r: 65, g:125, b:15},
    120: {r: 53, g:125, b:66},
    121: {r: 48, g:125, b:39},
    122: {r: 48, g:125, b:15},
    123: {r: 48, g:129, b:15},
    124: {r: 77, g:147, b:87},
    125: {r: 106, g:163, b:27},
    126: {r: 72, g:162, b:39},
    127: {r: 63, g:165, b:15},
    128: {r: 59, g:162, b:84},
    129: {r: 108, g:189, b:57},
    130: {r: 108, g:198, b:15},
    131: {r: 74, g:198, b:15},
    132: {r: 81, g:209, b:15},
    133: {r: 74, g:199, b:81},
    134: {r: 83, g:199, b:114},
    135: {r: 155, g:200, b:143},
    136: {r: 138, g:197, b:92},
    137: {r: 134, g:189, b:101},
    138: {r: 140, g:181, b:130},
    139: {r: 158, g:178, b:114},
    140: {r: 180, g:196, b:70},
    141: {r: 159, g:196, b:2},
    142: {r: 163, g:203, b:49},
    143: {r: 128, g:233, b:15},
    144: {r: 88, g:233, b:15},
    145: {r: 86, g:234, b:100},
    146: {r: 100, g:234, b:135},
    147: {r: 94, g:252, b:110},
    148: {r: 0, g:255, b:0},
    149: {r: 95, g:252, b:15},
    150: {r: 136, g:248, b:15},
    151: {r: 139, g:252, b:15},
    152: {r: 106, g:252, b:147},
    153: {r: 154, g:255, b:154},
    154: {r: 183, g:235, b:172},
    155: {r: 197, g:254, b:186},
    156: {r: 206, g:252, b:93},
    157: {r: 179, g:252, b:15},
    158: {r: 190, g:234, b:83},
    159: {r: 238, g:219, b:117},
    160: {r: 238, g:227, b:118},
    161: {r: 255, g:233, b:125},
    162: {r: 255, g:255, b:0},
    163: {r: 255, g:244, b:129},
    164: {r: 255, g:255, b:196},
    165: {r: 255, g:255, b:206},
    166: {r: 255, g:249, b:200},
    167: {r: 255, g:249, b:221},
    168: {r: 246, g:246, b:221},
    169: {r: 252, g:247, b:218},
    170: {r: 251, g:236, b:216},
    171: {r: 248, g:232, b:208},
    172: {r: 255, g:236, b:207},
    173: {r: 244, g:230, b:173},
    174: {r: 237, g:230, b:184},
    175: {r: 255, g:230, b:182},
    176: {r: 255, g:220, b:87},
    177: {r: 255, g:217, b:0},
    178: {r: 254, g:209, b:15},
    179: {r: 235, g:195, b:15},
    180: {r: 243, g:189, b:102},
    181: {r: 252, g:187, b:15},
    182: {r: 252, g:179, b:15},
    183: {r: 255, g:168, b:43},
    184: {r: 234, g:173, b:15},
    185: {r: 227, g:169, b:111},
    186: {r: 223, g:186, b:136},
    187: {r: 255, g:205, b:166},
    188: {r: 203, g:192, b:98},
    189: {r: 233, g:165, b:15},
    190: {r: 239, g:156, b:76},
    191: {r: 202, g:183, b:96},
    192: {r: 213, g:162, b:15},
    193: {r: 196, g:180, b:129},
    194: {r: 201, g:165, b:15},
    195: {r: 200, g:143, b:15},
    196: {r: 183, g:168, b:64},
    197: {r: 175, g:171, b:110},
    198: {r: 195, g:156, b:107},
    199: {r: 207, g:128, b:46},
    200: {r: 202, g:130, b:63},
    201: {r: 199, g:138, b:15},
    202: {r: 177, g:157, b:96},
    203: {r: 177, g:121, b:15},
    204: {r: 186, g:116, b:47},
    205: {r: 151, g:111, b:47},
    206: {r: 129, g:101, b:15},
    207: {r: 131, g:121, b:54},
    208: {r: 131, g:124, b:96},
    209: {r: 121, g:109, b:95},
    210: {r: 71, g:58, b:33},
    211: {r: 70, g:57, b:46},
    212: {r: 111, g:77, b:52},
    213: {r: 132, g:92, b:56},
    214: {r: 128, g:81, b:15},
    215: {r: 128, g:68, b:39},
    216: {r: 198, g:117, b:80},
    217: {r: 197, g:98, b:63},
    218: {r: 197, g:87, b:15},
    219: {r: 202, g:89, b:15},
    220: {r: 206, g:102, b:0},
    221: {r: 230, g:103, b:15},
    222: {r: 231, g:108, b:39},
    223: {r: 249, g:115, b:15},
    224: {r: 249, g:117, b:45},
    225: {r: 231, g:117, b:80},
    226: {r: 255, g:129, b:61},
    227: {r: 249, g:129, b:15},
    228: {r: 255, g:128, b:79},
    229: {r: 249, g:130, b:87},
    230: {r: 250, g:151, b:107},
    231: {r: 232, g:139, b:97},
    232: {r: 226, g:140, b:107},
    233: {r: 232, g:117, b:114},
    234: {r: 248, g:93, b:88},
    235: {r: 230, g:83, b:80},
    236: {r: 230, g:90, b:57},
    237: {r: 255, g:0, b:0},
    238: {r: 255, g:30, b:0},
    239: {r: 247, g:28, b:15},
    240: {r: 248, g:4, b:19},
    241: {r: 247, g:35, b:15},
    242: {r: 229, g:28, b:15},
    243: {r: 229, g:20, b:15},
    244: {r: 221, g:53, b:25},
    245: {r: 197, g:72, b:39},
    246: {r: 196, g:68, b:63},
    247: {r: 194, g:61, b:0},
    248: {r: 195, g:20, b:15},
    249: {r: 161, g:0, b:6},
    250: {r: 155, g:0, b:9},
    251: {r: 141, g:0, b:19},
    252: {r: 150, g:67, b:49},
    253: {r: 127, g:49, b:15},
    254: {r: 139, g:63, b:15},
    255: {r: 127, g:53, b:15},
    256: {r: 129, g:0, b:15},
    257: {r: 130, g:0, b:63},
    258: {r: 126, g:0, b:63},
    259: {r: 127, g:49, b:76},
    260: {r: 126, g:0, b:81},
    261: {r: 128, g:77, b:81},
    262: {r: 128, g:89, b:87},
    263: {r: 128, g:81, b:93},
    264: {r: 181, g:133, b:130},
    265: {r: 199, g:145, b:143},
    266: {r: 198, g:130, b:138},
    267: {r: 198, g:136, b:148},
    268: {r: 233, g:175, b:172},
    269: {r: 237, g:199, b:194},
    270: {r: 238, g:203, b:177},
    271: {r: 254, g:216, b:229},
    272: {r: 253, g:224, b:255},
    273: {r: 255, g:224, b:222},
    274: {r: 252, g:189, b:187},
    275: {r: 251, g:177, b:198},
    276: {r: 251, g:177, b:188},
    277: {r: 250, g:169, b:178},
    278: {r: 232, g:163, b:178},
    279: {r: 232, g:155, b:165},
    280: {r: 228, g:139, b:176},
    281: {r: 248, g:121, b:163},
    282: {r: 230, g:110, b:149},
    283: {r: 247, g:96, b:173},
    284: {r: 253, g:108, b:134},
    285: {r: 247, g:49, b:139},
    286: {r: 246, g:35, b:136},
    287: {r: 229, g:94, b:159},
    288: {r: 229, g:35, b:125},
    289: {r: 246, g:49, b:172},
    290: {r: 255, g:0, b:255},
    291: {r: 228, g:45, b:159},
    292: {r: 245, g:47, b:255},
    293: {r: 210, g:101, b:136},
    294: {r: 196, g:89, b:125},
    295: {r: 204, g:28, b:107},
    296: {r: 195, g:35, b:105},
    297: {r: 195, g:28, b:103},
    298: {r: 196, g:81, b:132},
    299: {r: 195, g:28, b:132},
    300: {r: 187, g:56, b:144},
    301: {r: 127, g:87, b:127},
    302: {r: 86, g:20, b:127},
    303: {r: 87, g:52, b:88},
    304: {r: 73, g:0, b:131},
    305: {r: 68, g:20, b:127},
    306: {r: 77, g:53, b:127},
    307: {r: 97, g:61, b:80},
    308: {r: 94, g:89, b:129},
    309: {r: 106, g:35, b:127},
    310: {r: 126, g:20, b:127},
    311: {r: 169, g:72, b:201},
    312: {r: 178, g:70, b:183},
    313: {r: 108, g:40, b:201},
    314: {r: 133, g:40, b:208},
    315: {r: 142, g:53, b:203},
    316: {r: 123, g:93, b:201},
    317: {r: 128, g:53, b:237},
    318: {r: 143, g:49, b:240},
    319: {r: 138, g:56, b:255},
    320: {r: 133, g:103, b:216},
    321: {r: 164, g:56, b:237},
    322: {r: 178, g:63, b:255},
    323: {r: 193, g:88, b:231},
    324: {r: 146, g:115, b:237},
    325: {r: 160, g:124, b:255},
    326: {r: 213, g:98, b:255},
    327: {r: 227, g:53, b:237},
    328: {r: 197, g:143, b:201},
    329: {r: 202, g:164, b:202},
    330: {r: 231, g:171, b:237},
    331: {r: 225, g:178, b:255},
    332: {r: 200, g:176, b:201},
    333: {r: 250, g:185, b:255},
    334: {r: 211, g:187, b:212},
    335: {r: 218, g:209, b:237},
    336: {r: 236, g:222, b:227},
    337: {r: 228, g:229, b:251},
    338: {r: 254, g:239, b:245},
    339: {r: 255, g:246, b:239},
    340: {r: 255, g:253, b:255},
    341: {r: 250, g:250, b:250},
    343: {r: 9, g:9, b:9},
    344: {r: 20, g:20, b:20},
    345: {r: 25, g:25, b:25},
    346: {r: 43, g:43, b:43},
    347: {r: 63, g:63, b:63},
    348: {r: 75, g:75, b:75},
    349: {r: 84, g:84, b:84},
    350: {r: 93, g:93, b:93},
    351: {r: 108, g:108, b:108},
    352: {r: 124, g:124, b:124},
    353: {r: 137, g:137, b:137},
    354: {r: 149, g:149, b:149},
    355: {r: 170, g:170, b:170},
    356: {r: 188, g:188, b:188},
    357: {r: 204, g:204, b:204},
    358: {r: 218, g:218, b:218},
    359: {r: 232, g:232, b:232},
    342: {r: 0, g: 0, b:255},
    500: {r: 224, g:97, b:14},
    501: {r: 0, g:11, b:66},
    502: {r: 224, g:231, b:0},
    503: {r: 230, g:23, b:65},
    504: {r: 142, g:231, b:224},
    505: {r: 230, g:154, b:0},
    506: {r: 0, g:231, b:104},
    507: {r: 38, g:159, b:230},
    508: {r: 89, g:0, b:230},
    509: {r: 133, g:0, b:230},
    510: {r: 230, g:71, b:230},
    512: {r: 230, g:0, b:191},
    513: {r: 185, g:17, b:21},
    514: {r: 48, g:133, b:35},
    515: {r: 90, g:166, b:48},
    516: {r: 205, g:98, b:13},
    517: {r: 30, g:112, b:180},
    518: {r: 23, g:86, b:160},
    519: {r: 241, g:185, b:101},
    520: {r: 125, g:20, b:17},
    521: {r: 208, g:250, b:0},
    522: {r: 117, g:210, b:0},
    523: {r: 199, g:13, b:13},
    524: {r: 251, g:225, b:0},
    525: {r: 164, g:129, b:68},
    526: {r: 210, g:172, b:55},
    527: {r: 26, g:67, b:60},
    528: {r: 82, g:82, b:84},
    529: {r: 0, g:152, b:216},
    530: {r: 210, g:255, b:21},
    531: {r: 255, g:100, b:26},
    532: {r: 169,g: 185, b:197}
}