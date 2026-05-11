import json
import sys
from pathlib import Path


class ChakraFinder:
    def __init__(self, data_path: Path):
        self.data = self._load_data(data_path)
        self.nakshatras_dict = self.data["nakshatras"]
        self.chakras_dict = self.data["nava_tara_chakra"].get("chakras") or self.data[
            "nava_tara_chakra"
        ].get("chakra", [])
        self.nakshatra_name_with_index = {
            self._remove_spaces(item["nakshatra"]): idx
            for idx, item in enumerate(self.nakshatras_dict)
        }

    def _load_data(self, data_path: Path):
        with data_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _remove_spaces(self, text: str):
        return " ".join(text.strip().lower().split())

    def get_all_nakshatras_dict(self, nakshatra_name: str):
        # get all nakshatras dict with input nakshatra on first position
        normalized_name = self._remove_spaces(nakshatra_name)
        if normalized_name not in self.nakshatra_name_with_index:
            return None

        start_index = self.nakshatra_name_with_index[normalized_name]
        return self.nakshatras_dict[start_index:] + self.nakshatras_dict[:start_index]

    def get_all_nakshatras_dict_with_chakras(self, ordered_nakshatras_dict):
        # rules: sequences number is actually the position of the nakshatra in the ordered_nakshatras_dict
        # In nakshatras_dict append the chakra_name, chakra_result, auspicious_or_not by checking the sequences number
        nakshatras_dict_with_chakras = []
        for position, nakshatra in enumerate(ordered_nakshatras_dict, start=1):
            chakra_for_position = None
            for chakra in self.chakras_dict:
                sequence_list = chakra.get("sequences") or chakra.get("sequence") or []
                if position in sequence_list:
                    chakra_for_position = chakra
                    break

            merged = dict(nakshatra)
            merged.pop("sequence", None)
            if chakra_for_position:
                merged["chakra_name"] = chakra_for_position["name"]
                merged["chakra_result"] = chakra_for_position["result"]
                merged["auspicious"] = chakra_for_position["auspicious"]
            nakshatras_dict_with_chakras.append(merged)

        return nakshatras_dict_with_chakras

    def get_all_chakras_with_nakshatras(self, ordered_nakshatras_dict):
        # rules: sequences number is actually the position of the nakshatra in the ordered_nakshatras_dict
        # In chakras_dict append the nakshatra_name, ruling_planet, deity, tree, lucky_colors by checking the sequences number
        chakras_with_nakshatras = []
        for chakra in self.chakras_dict:
            sequence_list = chakra.get("sequences") or chakra.get("sequence") or []
            chakra_copy = dict(chakra)
            chakra_copy["nakshatras"] = []

            for position in sequence_list:
                if 1 <= position <= len(ordered_nakshatras_dict):
                    source = ordered_nakshatras_dict[position - 1]
                    chakra_copy["nakshatras"].append(
                        {
                            "position_from_input": position,
                            "nakshatra": source["nakshatra"],
                            "ruling_planet": source["ruling_planet"],
                            "deity": source["deity"],
                            "tree": source["tree"],
                            "lucky_colors": source["lucky_colors"],
                        }
                    )

            chakras_with_nakshatras.append(chakra_copy)

        return chakras_with_nakshatras

    def run(self, nakshatra_name: str):
        ordered_nakshatras_dict = self.get_all_nakshatras_dict(nakshatra_name)
        if not ordered_nakshatras_dict:
            print(f"Nakshatra '{nakshatra_name}' not found.")
            return None

        nakshatras_dict_with_chakras = self.get_all_nakshatras_dict_with_chakras(ordered_nakshatras_dict)
        chakras_with_nakshatras = self.get_all_chakras_with_nakshatras(ordered_nakshatras_dict)
        return {
            "input_nakshatra": self._remove_spaces(nakshatra_name),
            "nakshatras_with_chakra": nakshatras_dict_with_chakras,
            "chakras_with_nakshatras": chakras_with_nakshatras,
        }


def save_output(output_data, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(output_data, file, indent=2, ensure_ascii=False)


def main(input_nakshatra):
    root_path = Path(__file__).resolve().parent.parent
    json_path = root_path / "database" / "nakshatra.json"
    output_path = root_path / "output" / f"chakras_{input_nakshatra.lower().replace(' ', '_')}.json"

    chakra_finder = ChakraFinder(json_path)
    result = chakra_finder.run(input_nakshatra)
    if not result:
        sys.exit(1)

    save_output(result, output_path)
    print(f"output saved to: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python main/get_chakras.py "<Nakshatra Name>"')
        sys.exit(1)
    input_nakshatra = " ".join(sys.argv[1:]).strip()
    main(input_nakshatra)
