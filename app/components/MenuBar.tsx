'use client';

import Menu from "./Menu";

function MenuBar({ items }: any) {
    return <div className="menubar-container">
        <ul className="menubar">      
        {
            items.map((item: any, index: any) => {
                
                return <li key={index} className="menubar__item"><button className="menu__btn">{item.icon} {item.label}</button><Menu items={item.items} /></li>;
            })
        }
        </ul>
    </div>;
}

export default MenuBar;