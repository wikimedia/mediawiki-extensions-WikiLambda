<!--
	WikiLambda Vue component for a Typed List.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-typed-list"
		:class="nestingDepthClass"
		data-testid="z-typed-list"
	>
		<!-- Type of list item -->
		<wl-z-typed-list-type
			v-if="expanded"
			:key-path="keyPath"
			:object-value="objectValue[0]"
			:edit="edit"
			@type-changed="onTypeChange"
		></wl-z-typed-list-type>
		<!-- Collection of items -->
		<wl-z-typed-list-items
			:key-path="keyPath"
			:object-value="objectValue"
			:edit="edit"
			:expanded="expanded"
			:list-item-type="listItemType"
			@add-list-item="addListItem"
		></wl-z-typed-list-items>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions } = require( 'pinia' );

const { hybridToCanonical } = require( '../../utils/schemata.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );
const useMainStore = require( '../../store/index.js' );

// Type components
const ZTypedListItems = require( './ZTypedListItems.vue' );
const ZTypedListType = require( './ZTypedListType.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-z-typed-list',
	components: {
		'wl-z-typed-list-items': ZTypedListItems,
		'wl-z-typed-list-type': ZTypedListType
	},
	mixins: [ zobjectMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Array,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		expanded: {
			type: Boolean,
			required: true
		}
	},
	computed: {
		/**
		 * Returns the string representation of the expected
		 * type for the list items.
		 * We need this:
		 * - in this component, to add new item and create its scaffolding according to the type
		 * - in the children ObjectKeyValue components for each of the list items, to calculate
		 *   its expected type.
		 * This can be an object or a string, but it needs to be in canonical form.
		 *
		 * @return {string}
		 */
		listItemType: function () {
			return hybridToCanonical( this.objectValue[ 0 ] );
		},
		/**
		 * Returns the css class that identifies the nesting level
		 *
		 * @return {string[]}
		 */
		nestingDepthClass: function () {
			if ( this.expanded ) {
				return [
					'ext-wikilambda-app-object-key-value-set',
					`ext-wikilambda-app-key-level--${ this.depth || 0 }`
				];
			}
			return [];
		}
	},
	methods: Object.assign( {}, mapActions( useMainStore, [
		'handleListTypeChange'
	] ), {
		/**
		 * When the typed list item type (benjamin item) has
		 * changed, we keep track of the items that were present
		 * on the table, so that they can be reviewed and deleted
		 * before submission
		 *
		 * @param {Object} payload
		 * @param {string} payload.value new type
		 */
		onTypeChange: function ( payload ) {
			this.handleListTypeChange( {
				keyPath: this.keyPath,
				objectValue: this.objectValue,
				newType: payload.value
			} );
		},
		addListItem: function () {
			this.$emit( 'add-list-item', { value: this.listItemType } );
		}
	} )
} );
</script>
