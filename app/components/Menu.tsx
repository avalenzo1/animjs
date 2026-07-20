'use client';

function Menu({ items }: any) {
    return <ul className="menu">
        {items.map((item: any, index: any) => (item === "hr") ? <hr key={index }/> : <li className="menu__item" key={index}>
                <button className="menu__btn" onClick={item.action}>{item.label}</button>
            </li>)}
    </ul>;
}

export default Menu;