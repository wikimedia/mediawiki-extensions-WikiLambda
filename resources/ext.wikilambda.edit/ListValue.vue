<template>
	<!--
		WikiLambda Vue interface module for ZList manipulation.

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zlist">
		<ul>
			<li v-for="(item, index) in list" :key="index">
				<button :title="tooltipRemoveListItem" @click="removeItem(index)">
					{{ $i18n( 'wikilambda-editor-removeitem' ) }}
				</button>
				<type-selector v-if="listTypes[index] === 'new'"
					@change="setNewType($event, index)"
				></type-selector>
				<input v-else-if="listTypes[index] === 'Z6'"
					class="ext-wikilambda-zstring"
					:value="item"
					@input="updateStringValue($event, index)"
				>
				<list-value v-else-if="listTypes[index] === 'Z10'"
					:list="item"
					@input="updateValue($event, index)"
				></list-value>
				<multi-lingual-string v-else-if="listTypes[index] === 'Z12'"
					:mls-object="item"
					@input="updateValue($event, index)"
				></multi-lingual-string>
				<full-zobject v-else
					:zobject="item"
					:persistent="false"
					@input="updateValue($event, index)"
				></full-zobject>
			</li>
			<li>
				<button :title="tooltipAddListItem" @click="addNewItem">
					{{ $i18n( 'wikilambda-editor-additem' ) }}
				</button>
			</li>
		</ul>
	</div>
</template>

<script>
var FullZobject = require( './FullZobject.vue' ),
	TypeSelector = require( './TypeSelector.vue' ),
	ZMultiLingualString = require( './ZMultiLingualString.vue' );

module.exports = {
	name: 'list-value',
	props: [ 'list' ],
	data: function () {
		var listTypes = this.list.map( function ( item ) {
			var type = 'string';
			if ( typeof ( item ) === 'object' ) {
				if ( Array.isArray( item ) ) {
					type = 'list';
				} else {
					type = 'zobject';
				}
			}
			return type;
		} );
		return {
			listTypes: listTypes,
			tooltipRemoveListItem: this.$i18n( 'wikilambda-editor-zlist-removeitem-tooltip' ),
			tooltipAddListItem: this.$i18n( 'wikilambda-editor-zlist-additem-tooltip' )
		};
	},
	methods: {
		addNewItem: function ( /* event */ ) {
			this.list.push( '' );
			this.listTypes.push( 'new' );
			this.$emit( 'input', this.list );
		},
		setNewType: function ( newType, index ) {
			if ( newType === 'Z6' ) {
				this.$set( this.list, index, '' );
			} else if ( newType === 'Z10' ) {
				this.$set( this.list, index, [] );
			} else {
				this.$set( this.list, index, { Z1K1: newType } );
			}
			this.$set( this.listTypes, index, newType );
			this.$emit( 'input', this.list );
		},
		removeItem: function ( index ) {
			this.list.splice( index, 1 );
			this.listTypes.splice( index, 1 );
			this.$emit( 'input', this.list );
		},
		updateValue: function ( value, index ) {
			this.$set( this.list, index, value );
			this.$emit( 'input', this.list );
		},
		updateStringValue: function ( event, index ) {
			this.$set( this.list, index, event.target.value );
			this.$emit( 'input', this.list );
		}
	},
	components: {
		'full-zobject': FullZobject,
		'type-selector': TypeSelector,
		'multi-lingual-string': ZMultiLingualString
	}
};
</script>

<style lang="less">
.ext-wikilambda-zlist {
	background: #eee;
	padding: 0 0.5em;
}

.ext-wikilambda-zstring {
	background: #eef;
}

.ext-wikilambda-zlist::before {
	content: '['
}

.ext-wikilambda-zlist::after {
	content: ']'
}
</style>
