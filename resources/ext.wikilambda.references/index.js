/**
 * WikiLambda references: Popover on desktop (hover/focus) and Drawer on mobile (click).
 */
'use strict';

const { createMwApp } = require( 'vue' );
const ReferenceManager = require( './components/reference/ReferenceManager.vue' );

const mountNode = document.createElement( 'div' );
mountNode.className = 'ext-wikilambda-references-root';
document.body.appendChild( mountNode );

createMwApp( ReferenceManager ).mount( mountNode );
