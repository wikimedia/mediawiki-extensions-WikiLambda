<template>
	<!--
		WikiLambda Vue interface module for ZList manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zlist">
		<ul>
			<li v-for="(type, index) in listTypes" :key="index">
				<button v-if="!viewmode"
					:title="tooltipRemoveListItem"
					@click="removeItem(index)"
				>
					{{ $i18n( 'wikilambda-editor-removeitem' ) }}
				</button>
				<z-object-selector
					v-if="type === 'new'"
					:viewmode="viewmode"
					:type="Constants.Z_TYPE"
					:placeholder="$i18n( 'wikilambda-typeselector-label' )"
					@input="setNewType($event, index)"
				></z-object-selector>
				<z-object v-else
					:zobject="zobject[ index ]"
					:persistent="false"
					:viewmode="viewmode"
					@change="updateValue($event, index)"
				></z-object>
			</li>
			<li v-if="!viewmode">
				<button :title="tooltipAddListItem" @click="addNewItem">
					{{ $i18n( 'wikilambda-editor-additem' ) }}
				</button>
			</li>
		</ul>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZMultilingualString = require( './ZMultilingualString.vue' );

module.exports = {
	name: 'ZList',
	components: {
		'z-object-selector': ZObjectSelector,
		'z-multilingual-string': ZMultilingualString
	},
	mixins: [ typeUtils ],
	props: {
		zobject: {
			type: Array,
			default: function () {
				return [];
			}
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			Constants: Constants,
			listTypes: []
		};
	},
	computed: {
		tooltipRemoveListItem: function () {
			return this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' );
		},
		tooltipAddListItem: function () {
			this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' );
		}
	},
	methods: {
		addNewItem: function ( /* event */ ) {
			this.listTypes.push( 'new' );
		},

		setNewType: function ( newType, index ) {
			this.$set( this.listTypes, index, newType );
			this.$emit( 'add-item', this.getInitialValue( newType ) );
		},

		removeItem: function ( index ) {
			this.listTypes.splice( index, 1 );
			this.$emit( 'delete-item', index );
		},

		updateValue: function ( value, index ) {
			this.$emit( 'change-item', {
				index: index,
				value: value
			} );
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( './../ZObject.vue' );
	},
	created: function () {
		var self = this;
		this.listTypes = this.zobject.map( function ( item ) {
			return self.getZObjectType( item );
		} );
	}
};
</script>

<style lang="less">
.ext-wikilambda-zlist {
	background: #eee;
	padding: 0 0.5em;
}

input.ext-wikilambda-zstring {
	background: #eef;
}

.ext-wikilambda-zlist:before {
	content: '[';
}

.ext-wikilambda-zlist:after {
	content: ']';
}
</style>
