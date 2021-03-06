<template>
	<!--
		WikiLambda Vue component for ZObject items in ZLists.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<li class="ext-wikilambda-zlistItem">
		<button v-if="!(viewmode || readonly)"
			class="z-list-item-remove"
			:title="tooltipRemoveListItem"
			@click="removeItem"
		>
			{{ $i18n( 'wikilambda-editor-removeitem' ) }}
		</button>
		<z-object-selector
			v-if="isEmptyObject"
			:type="zType"
			:placeholder="$i18n( 'wikilambda-typeselector-label' )"
			:readonly="readonly"
			@input="onTypeChange"
		></z-object-selector>
		<z-object v-else
			:zobject-id="zobjectId"
			:persistent="false"
			:readonly="readonly"
		></z-object>
	</li>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	name: 'ZListItem',
	components: {
		'z-object-selector': ZObjectSelector
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		},
		zType: {
			type: String,
			default: ''
		}
	},
	data: function () {
		return {
			Constants: Constants,
			listTypes: []
		};
	},
	computed: $.extend( {},
		mapGetters( {
			getZObjectChildrenById: 'getZObjectChildrenById',
			viewmode: 'getViewMode'
		} ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			isEmptyObject: function () {
				return this.zobject.length === 0;
			},
			tooltipRemoveListItem: function () {
				return this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' );
			},
			tooltipAddListItem: function () {
				this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' );
			}
		} ),
	methods: $.extend( {},
		mapActions( [ 'setZObjectValue', 'removeZObject', 'removeZObjectChildren', 'changeType' ] ),
		{
			/**
			 * Remove this item form the ZList
			 *
			 */
			removeItem: function () {
				this.removeZObjectChildren( this.zobjectId );
				this.removeZObject( this.zobjectId );
			},
			/*
			* Sets the current list item type.
			*
			* @param {string} type
			*/
			onTypeChange: function ( type ) {
				var payload = {
					type: type,
					id: this.zobjectId
				};
				this.changeType( payload );
			}
		} ),
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( './../ZObject.vue' );
	}
};
</script>
