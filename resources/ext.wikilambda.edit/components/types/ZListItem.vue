<template>
	<!--
		WikiLambda Vue component for ZObject items in ZLists.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<li class="ext-wikilambda-zlistItem">
		<sd-button v-if="!(viewmode || readonly)"
			class="z-list-item-remove"
			:destructive="true"
			:title="tooltipRemoveListItem"
			@click="$emit('remove-item', zobjectId )"
		>
			{{ $i18n( 'wikilambda-editor-removeitem' ) }}
		</sd-button>
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
	inject: {
		viewmode: { default: false }
	},
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
			getZObjectTypeById: 'getZObjectTypeById'
		} ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zobjectType: function () {
				return this.getZObjectTypeById( this.zobjectId );
			},
			isEmptyObject: function () {
				return !this.zobjectType;
			},
			tooltipRemoveListItem: function () {
				return this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' );
			},
			tooltipAddListItem: function () {
				this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' );
			}
		} ),
	methods: $.extend( {},
		mapActions( [ 'setZObjectValue', 'changeType' ] ),
		{
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
