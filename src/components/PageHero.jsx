import { Link } from 'react-router-dom'

export default function PageHero({ title, lead, bg, crumb }) {
  return (
    <div className="page-hero">
      {bg && <div className="bg" style={{ backgroundImage: `url(${bg})` }}></div>}
      <div className="scrim"></div>
      <div className="container">
        <div className="crumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>{crumb || title}</span>
        </div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
    </div>
  )
}
