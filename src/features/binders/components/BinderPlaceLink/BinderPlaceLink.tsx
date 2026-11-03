import type React from "react";
import { Link } from "react-router";
import { placeUrl, type BinderPlace } from "../../layout";

type BinderPlaceLinkProps = {
  place: BinderPlace;
};

// "Kanto & Johto · page 3, pocket 7", opening the binder on that pocket.
const BinderPlaceLink: React.FC<BinderPlaceLinkProps> = ({ place }) => (
  <Link to={placeUrl(place)}>
    {`${place.binder.name} · page ${place.page}, pocket ${place.pocket}`}
  </Link>
);

export default BinderPlaceLink;
